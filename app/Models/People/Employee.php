<?php

namespace App\Models\People;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * The existing TAB staff directory (tab_employees). Read-only: this app never writes to it.
 * toEntity() gives the shape the frontend's old Base44 Employee entity had.
 */
class Employee extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    public function getConnectionName()
    {
        return config('compliance.people.connection');
    }

    public function getTable()
    {
        return config('compliance.people.employees_table');
    }

    public function save(array $options = [])
    {
        return false;
    }

    public function delete()
    {
        return false;
    }

    public static function emailColumn(): string
    {
        return config('compliance.people.email_column');
    }

    public static function findByEmail(string $email): ?self
    {
        return static::query()->whereRaw('lower(' . static::emailColumn() . ') = ?', [strtolower($email)])->first();
    }

    /** Leaver = disabled, soft-deleted, or past their end date. */
    public function isLeaver(): bool
    {
        return (bool) $this->disabled
            || $this->deleted_at !== null
            || ($this->end_date !== null && substr((string) $this->end_date, 0, 10) < now()->toDateString());
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where(fn ($q) => $q->whereNull('disabled')->orWhere('disabled', 0))
            ->whereNull('deleted_at')
            ->where(fn ($q) => $q->whereNull('end_date')->orWhere('end_date', '>=', now()->toDateString()));
    }

    public function fullName(): string
    {
        return trim($this->given_names . ' ' . $this->family_name);
    }

    public function toEntity(): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->fullName(),
            'email' => $this->{static::emailColumn()},
            'job_title' => $this->title,
            'department' => $this->department_id,
            'line_manager' => $this->line_manager_id,
            'mobile' => $this->work_number ?: $this->phone_number,
            'status' => $this->isLeaver() ? 'Leaver' : 'Active',
        ];
    }
}
