<?php

namespace App\Support;

use App\Models\Access\DepartmentSettings;
use App\Models\Access\Permission;
use App\Models\Access\UserRole;
use App\Models\People\Employee;

/** The signed-in person for this request: identity, role, employee record and section permissions. */
class Viewer
{
    private ?array $permissions = null;

    private ?string $departmentId = null;

    private bool $departmentResolved = false;

    public function __construct(
        public readonly string $email,
        public readonly ?string $name,
        public readonly string $role,
        public readonly ?Employee $employee,
    ) {}

    public static function resolve(string $email, ?string $name): self
    {
        $role = UserRole::find($email)?->role ?? 'read_only';
        try {
            $employee = Employee::findByEmail($email);
        } catch (\Throwable $e) {
            report($e);
            $employee = null; // staff DB unreachable: still identified, just without an employee link
        }

        return new self($email, $name ?? $employee?->fullName(), $role, $employee);
    }

    public function employeeId(): ?string
    {
        return $this->employee?->id;
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /** For a department head: the department they head (cc_department_settings.head), as the old app did. */
    public function departmentId(): ?string
    {
        if (! $this->departmentResolved) {
            $this->departmentResolved = true;
            if ($this->role === 'department_head' && $this->employeeId()) {
                $this->departmentId = DepartmentSettings::where('head', $this->employeeId())->value('department_id');
            }
        }

        return $this->departmentId;
    }

    /** @return array<string, array{can_view: bool, can_edit: bool}> */
    public function sectionPermissions(): array
    {
        return $this->permissions ??= Permission::where('email', $this->email)->get()
            ->mapWithKeys(fn ($p) => [$p->section => ['can_view' => $p->can_view, 'can_edit' => $p->can_edit]])
            ->all();
    }

    public function toArray(): array
    {
        return [
            'id' => $this->employeeId(),
            'email' => $this->email,
            'full_name' => $this->name,
            'role' => $this->role,
            'employee_id' => $this->employeeId(),
            'department' => $this->employee?->department_id,
        ];
    }
}
