<?php

namespace App\Models\Access;

use Illuminate\Database\Eloquent\Model;

class UserRole extends Model
{
    const CREATED_AT = 'created_date';
    const UPDATED_AT = 'updated_date';

    protected $table = 'cc_user_role';

    protected $primaryKey = 'email';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['email', 'role', 'created_by'];
}
