<?php

namespace App\Http\Controllers;

use App\Models\Access\Permission;
use App\Models\Access\UserRole;
use App\Models\Compliance\ChangeLog;
use App\Support\Viewer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Roles and per-section permissions (the old Base44 User.role + Permission entity). */
class AccessController extends Controller
{
    /** Per request, not constructor-injected (controller instances are reused). */
    private function viewer(): Viewer
    {
        return app(Viewer::class);
    }

    public function me(): JsonResponse
    {
        return response()->json($this->viewer()->toArray());
    }

    /** Permission rows in the old shape. Admins see everyone's; others only their own. */
    public function permissions(Request $request): JsonResponse
    {
        $filter = $request->input('filter');
        $filter = is_string($filter) ? (json_decode($filter, true) ?? []) : (array) $filter;
        $email = $filter['user'] ?? null;

        $q = Permission::query();
        if (! $this->viewer()->isAdmin()) {
            $q->where('email', $this->viewer()->email);
        } elseif ($email) {
            $q->where('email', strtolower($email));
        }

        return response()->json($q->get()->map(fn ($p) => [
            'id' => $p->id,
            'user' => $p->email,
            'section' => $p->section,
            'can_view' => $p->can_view ? 'Yes' : 'No',
            'can_edit' => $p->can_edit ? 'Yes' : 'No',
        ]));
    }

    public function roles(): JsonResponse
    {
        abort_unless($this->viewer()->isAdmin(), 403);

        return response()->json(UserRole::orderBy('email')->get(['email', 'role']));
    }

    /** Body: {email, role}. Admin only, and not on yourself (so nobody locks themselves out). */
    public function setRole(Request $request): JsonResponse
    {
        abort_unless($this->viewer()->isAdmin(), 403, 'Only an administrator can change roles.');
        $data = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', 'in:'.implode(',', config('compliance.roles'))],
        ]);
        $email = strtolower($data['email']);
        abort_if($email === $this->viewer()->email, 422, 'You cannot change your own role.');

        DB::transaction(function () use ($email, $data) {
            $previous = UserRole::find($email)?->role ?? 'read_only';
            UserRole::updateOrCreate(['email' => $email], ['role' => $data['role'], 'created_by' => $this->viewer()->email]);
            $this->audit($email, ['role' => ['from' => $previous, 'to' => $data['role']]]);
        });

        return response()->json(['ok' => true]);
    }

    /**
     * Port of the savePermissions function. Body: {target_user: email, permissions: [{section,
     * can_view: "Yes"|"No", can_edit: "Yes"|"No"}]}. Only granted sections are stored.
     */
    public function savePermissions(Request $request): JsonResponse
    {
        abort_unless($this->viewer()->isAdmin(), 403, 'Only an administrator can manage permissions.');
        $data = $request->validate([
            'target_user' => ['required', 'email'],
            'permissions' => ['array'],
            'permissions.*.section' => ['required', 'in:'.implode(',', config('compliance.sections'))],
        ]);
        $target = strtolower($data['target_user']);
        abort_if($target === $this->viewer()->email, 422, 'You cannot edit your own permissions.');
        abort_if(UserRole::find($target)?->role === 'admin', 422,
            'Administrator access is role-based and cannot be adjusted here.');

        $desired = [];
        foreach ($request->input('permissions', []) as $p) {
            if (($p['can_view'] ?? null) === 'Yes') {
                $desired[$p['section']] = ['can_view' => true, 'can_edit' => ($p['can_edit'] ?? null) === 'Yes'];
            }
        }

        $changes = DB::transaction(function () use ($target, $desired) {
            $existing = Permission::where('email', $target)->get()->keyBy('section');
            $changes = [];
            foreach ($existing as $section => $p) {
                $d = $desired[$section] ?? null;
                if (! $d) {
                    $p->delete();
                    $changes[] = ['section' => $section, 'from' => $p->only('can_view', 'can_edit'), 'to' => null];
                } elseif ($d['can_edit'] !== $p->can_edit) {
                    $changes[] = ['section' => $section, 'from' => $p->only('can_view', 'can_edit'), 'to' => $d];
                    $p->update($d);
                }
            }
            foreach ($desired as $section => $d) {
                if (! $existing->has($section)) {
                    Permission::create(['email' => $target, 'section' => $section, 'created_by' => $this->viewer()->email] + $d);
                    $changes[] = ['section' => $section, 'from' => null, 'to' => $d];
                }
            }
            if ($changes) {
                $this->audit($target, ['permissions' => $changes]);
            }

            return $changes;
        });

        return response()->json(['ok' => true, 'changes' => count($changes)]);
    }

    private function audit(string $target, array $changes): void
    {
        ChangeLog::create([
            'action' => 'updated',
            'entity' => 'Permission',
            'record_id' => $target,
            'record_ref' => $target,
            'changes' => json_encode($changes),
            'timestamp' => now(),
            'user' => $this->viewer()->email,
            'user_name' => $this->viewer()->name,
        ]);
    }
}
