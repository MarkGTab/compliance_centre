<?php

namespace App\Models\Access;

use Illuminate\Database\Eloquent\Model;

class DepartmentSettings extends Model
{
    const CREATED_AT = 'created_date';

    const UPDATED_AT = 'updated_date';

    protected $table = 'cc_department_settings';

    protected $primaryKey = 'department_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['department_id', 'head', 'line_of_defence', 'description', 'created_by'];
}
