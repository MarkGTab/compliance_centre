<?php

namespace App\Models\Access;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    use HasUuids;

    const CREATED_AT = 'created_date';

    const UPDATED_AT = 'updated_date';

    protected $table = 'cc_permission';

    protected $fillable = ['email', 'section', 'can_view', 'can_edit', 'created_by'];

    protected function casts(): array
    {
        return ['can_view' => 'boolean', 'can_edit' => 'boolean'];
    }
}
