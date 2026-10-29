<?php

namespace App\Models\Access;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/** Admin-editable settings (sender mailbox, Teams webhook, …). Secret values are encrypted at rest. */
class Setting extends Model
{
    const CREATED_AT = null;
    const UPDATED_AT = 'updated_date';

    protected $table = 'cc_setting';

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value', 'encrypted', 'updated_by'];

    protected function casts(): array
    {
        return ['encrypted' => 'boolean'];
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $row = static::find($key);
        if (! $row || $row->value === null) {
            return $default;
        }

        return $row->encrypted ? Crypt::decryptString($row->value) : $row->value;
    }

    public static function put(string $key, ?string $value, bool $encrypted, ?string $by): void
    {
        static::updateOrCreate(['key' => $key], [
            'value' => $value === null ? null : ($encrypted ? Crypt::encryptString($value) : $value),
            'encrypted' => $encrypted,
            'updated_by' => $by,
        ]);
    }
}
