<?php

namespace App\Http\Controllers;

use App\Models\Compliance\Entity;
use App\Models\Compliance\Risk;
use App\Services\ChangeLogger;
use App\Services\EntityQuery;
use App\Services\EntityValidator;
use App\Support\Access;
use App\Support\Viewer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Generic CRUD for every cc_* entity, shaped like the Base44 SDK the frontend was written against
 * (list / filter / get / create / bulkCreate / update / bulkUpdate / updateMany / delete).
 */
class EntityController extends Controller
{
    private const MAX_LIMIT = 10000;

    // Resolved per request, never in the constructor: Laravel reuses controller instances, so a
    // constructor-injected viewer could leak from one request into the next.
    private function access(): Access
    {
        return app(Access::class);
    }

    private function viewer(): Viewer
    {
        return app(Viewer::class);
    }

    private function log(): ChangeLogger
    {
        return app(ChangeLogger::class);
    }

    public function index(Request $request, string $entity): JsonResponse
    {
        $class = $this->modelClass($entity);
        $filter = $request->input('filter');
        if (is_string($filter)) {
            $filter = json_decode($filter, true);
        }
        if ($filter !== null && ! is_array($filter)) {
            throw ValidationException::withMessages(['filter' => 'Filter must be a JSON object.']);
        }

        $q = $this->scoped($entity, $class::query());
        EntityQuery::apply($q, array_keys($class::schemaFields()), $filter ?? [], $request->input('sort'));
        $q->skip(max(0, (int) $request->input('skip', 0)))
            ->take(min(self::MAX_LIMIT, max(1, (int) $request->input('limit', 5000))));

        return response()->json($q->get());
    }

    public function show(string $entity, string $id): JsonResponse
    {
        $class = $this->modelClass($entity);

        return response()->json($this->scoped($entity, $class::query())->findOrFail($id));
    }

    public function store(Request $request, string $entity): JsonResponse
    {
        $class = $this->modelClass($entity);
        abort_unless($this->access()->canCreate($entity), 403, "You can't create $entity records.");

        $record = DB::transaction(fn () => $this->create($entity, $class, $request->all()));

        return response()->json($record, 201);
    }

    public function bulkStore(Request $request, string $entity): JsonResponse
    {
        $class = $this->modelClass($entity);
        abort_unless($this->access()->canCreate($entity), 403, "You can't create $entity records.");
        $rows = $request->json()->all();
        abort_unless(array_is_list($rows), 422, 'Expected an array of records.');

        $records = DB::transaction(fn () => array_map(fn ($row) => $this->create($entity, $class, (array) $row), $rows));

        return response()->json($records, 201);
    }

    public function update(Request $request, string $entity, string $id): JsonResponse
    {
        $class = $this->modelClass($entity);
        $record = DB::transaction(fn () => $this->updateOne($entity, $class::findOrFail($id), $request->all()));

        return response()->json($record);
    }

    /** Body: [{id, ...fields}, …] */
    public function bulkUpdate(Request $request, string $entity): JsonResponse
    {
        $class = $this->modelClass($entity);
        $rows = $request->json()->all();
        abort_unless(array_is_list($rows), 422, 'Expected an array of records.');

        $records = DB::transaction(fn () => array_map(function ($row) use ($entity, $class) {
            abort_unless(isset($row['id']), 422, 'Every record needs an id.');

            return $this->updateOne($entity, $class::findOrFail($row['id']), $row);
        }, $rows));

        return response()->json($records);
    }

    /**
     * Body: {filter, update}. update holds plain fields ($set) and the two array operators the
     * frontend uses: {"$addToSet": {"linked_risks": id}} and {"$pull": {"linked_risks": id}}.
     */
    public function updateMany(Request $request, string $entity): JsonResponse
    {
        $class = $this->modelClass($entity);
        $fields = $class::schemaFields();
        $q = EntityQuery::apply($class::query(), array_keys($fields), (array) $request->input('filter', []));
        $update = (array) $request->input('update', []);

        $count = DB::transaction(function () use ($q, $update, $entity, $fields) {
            $count = 0;
            foreach ($q->get() as $record) {
                $data = array_diff_key($update, array_flip(['$set', '$addToSet', '$pull'])) + (array) ($update['$set'] ?? []);
                foreach (['$addToSet', '$pull'] as $op) {
                    foreach ((array) ($update[$op] ?? []) as $field => $value) {
                        abort_unless(($fields[$field]['type'] ?? null) === 'array', 422, "$op needs an array field.");
                        $current = $data[$field] ?? $record->$field ?? [];
                        $data[$field] = $op === '$addToSet'
                            ? array_values(array_unique([...$current, $value]))
                            : array_values(array_filter($current, fn ($v) => $v !== $value));
                    }
                }
                $this->updateOne($entity, $record, $data);
                $count++;
            }

            return $count;
        });

        return response()->json(['updated' => $count]);
    }

    public function destroy(string $entity, string $id): JsonResponse
    {
        $class = $this->modelClass($entity);
        abort_unless($this->access()->canDelete($entity), 403, "You can't delete $entity records.");
        $record = $class::findOrFail($id);

        DB::transaction(function () use ($record, $entity) {
            $record->delete();
            $this->log()->log('deleted', $entity, $record);
        });

        return response()->json(['deleted' => true]);
    }

    // ------------------------------------------------------------------------------------------

    /** @return class-string<Entity> */
    private function modelClass(string $entity): string
    {
        abort_unless(config("entities.$entity") !== null, 404, "Unknown entity \"$entity\".");

        return 'App\\Models\\Compliance\\'.$entity;
    }

    /** Applies the viewer's read scope for personal-data entities (Access::RESTRICTED_READ). */
    private function scoped(string $entity, Builder $q): Builder
    {
        $scope = $this->access()->readScope($entity);
        if ($scope === null) {
            return $q;
        }
        if ($scope === []) {
            return $q->whereRaw('1 = 0');
        }

        return $q->where(function ($w) use ($scope) {
            foreach ($scope as $field) {
                $w->orWhere($field, $this->viewer()->employeeId());
            }
        });
    }

    private function create(string $entity, string $class, array $input): Entity
    {
        $data = EntityValidator::validate($entity, $input, true);
        $record = new $class($data);
        if ($this->viewer()->role === 'department_head' && in_array($entity, ['Risk', 'Control', 'Action'])) {
            abort_unless($this->departmentOf($entity, $record) === $this->viewer()->departmentId(), 403,
                'Department heads can only add records for their own department.');
        }
        $record->created_by = $this->viewer()->email;
        $this->stamp($record);
        $record->save();
        $this->log()->log('created', $entity, $record);

        return $record->fresh();
    }

    private function updateOne(string $entity, Entity $record, array $input): Entity
    {
        abort_unless($this->access()->canUpdate($entity, $this->departmentOf($entity, $record)), 403,
            "You can't edit this $entity record.");
        $before = $record->toArray();
        $record->fill(EntityValidator::validate($entity, $input, false));
        if ($record->isDirty() && $this->viewer()->role === 'department_head') {
            // Can't move a record out of (or into) a department you don't head.
            abort_unless($this->access()->canUpdate($entity, $this->departmentOf($entity, $record)), 403,
                "You can't move this $entity record to another department.");
        }
        $this->stamp($record);
        $record->save();
        $this->log()->log('updated', $entity, $record, $before);

        return $record->fresh();
    }

    private function stamp(Entity $record): void
    {
        $fields = $record::schemaFields();
        if (isset($fields['last_modified_by'])) {
            $record->last_modified_by = $this->viewer()->email;
        }
        if (isset($fields['last_modified_date'])) {
            $record->last_modified_date = now();
        }
    }

    /** The department a department head's edit rights are checked against. Actions inherit their risk's. */
    private function departmentOf(string $entity, Entity $record): ?string
    {
        return match ($entity) {
            'Risk', 'Control' => $record->department,
            'Action' => $record->linked_risk ? Risk::find($record->linked_risk)?->department : null,
            default => null,
        };
    }
}
