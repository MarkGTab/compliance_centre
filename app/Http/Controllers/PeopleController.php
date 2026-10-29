<?php

namespace App\Http\Controllers;

use App\Models\Access\DepartmentSettings;
use App\Models\People\Department;
use App\Models\People\Employee;
use App\Services\ChangeLogger;
use App\Support\Viewer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Employee and Department, served in the old Base44 entity shape but read from the existing
 * tab_employees / departments tables. Employees are read-only here (they're maintained in admin);
 * for departments only the compliance extras (head, line of defence, description) are editable.
 */
class PeopleController extends Controller
{
    public function employees(Request $request): JsonResponse
    {
        return response()->json($this->filtered(
            Employee::query()->get()->map->toEntity(), $request
        ));
    }

    public function employee(string $id): JsonResponse
    {
        return response()->json(Employee::findOrFail($id)->toEntity());
    }

    public function departments(Request $request): JsonResponse
    {
        $settings = DepartmentSettings::all()->keyBy('department_id');

        return response()->json($this->filtered(
            Department::query()->get()->map(fn ($d) => $d->toEntity($settings->get($d->id))), $request
        ));
    }

    public function department(string $id): JsonResponse
    {
        return response()->json(Department::findOrFail($id)->toEntity(DepartmentSettings::find($id)));
    }

    public function updateDepartment(Request $request, string $id, Viewer $viewer, ChangeLogger $log): JsonResponse
    {
        abort_unless($viewer->isAdmin(), 403, 'Only an administrator can edit departments.');
        $department = Department::findOrFail($id);
        $data = $request->validate([
            'head' => ['nullable', 'string', 'max:64'],
            'line_of_defence' => ['nullable', 'in:First,Second,Third'],
            'description' => ['nullable', 'string'],
        ]);

        $settings = DepartmentSettings::firstOrNew(['department_id' => $id], ['created_by' => $viewer->email]);
        $before = $settings->toArray();
        $settings->fill($data)->save();
        $log->log($settings->wasRecentlyCreated ? 'created' : 'updated', 'Department', $settings, $before);

        return response()->json($department->toEntity($settings));
    }

    /** Small in-memory list/filter/sort: a few hundred staff, so no need for SQL translation. */
    private function filtered(Collection $rows, Request $request): array
    {
        $filter = $request->input('filter');
        $filter = is_string($filter) ? (json_decode($filter, true) ?? []) : (array) $filter;
        foreach ($filter as $field => $cond) {
            $rows = $rows->filter(fn ($r) => is_array($cond) && isset($cond['$in'])
                ? in_array($r[$field] ?? null, $cond['$in'])
                : strcasecmp((string) ($r[$field] ?? ''), (string) $cond) === 0);
        }
        if ($sort = $request->input('sort')) {
            $rows = $rows->sortBy(ltrim($sort, '-+'), SORT_NATURAL | SORT_FLAG_CASE, str_starts_with($sort, '-'));
        } else {
            $rows = $rows->sortBy('full_name', SORT_NATURAL | SORT_FLAG_CASE)->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE);
        }

        return $rows->values()->all();
    }
}
