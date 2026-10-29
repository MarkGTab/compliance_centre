<?php

namespace App\Models\People;

use App\Models\Access\DepartmentSettings;
use Illuminate\Database\Eloquent\Model;

/** The existing departments table. Read-only; the compliance extras live in cc_department_settings. */
class Department extends Model
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
        return config('compliance.people.departments_table');
    }

    public function save(array $options = [])
    {
        return false;
    }

    public function delete()
    {
        return false;
    }

    public function toEntity(?DepartmentSettings $settings = null): array
    {
        return [
            'id' => $this->id,
            'name' => $this->{config('compliance.people.department_name_column')},
            'head' => $settings?->head,
            'line_of_defence' => $settings?->line_of_defence,
            'description' => $settings?->description,
        ];
    }
}
