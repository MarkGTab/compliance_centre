<?php

namespace App\Models\Compliance;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Base for every cc_* entity. Fields, casts and validation come from config/entities.php, so a
 * model is just its table name. Timestamps keep Base44's names (created_date / updated_date)
 * because the frontend sorts and displays on them.
 */
abstract class Entity extends Model
{
    use HasUuids;

    const CREATED_AT = 'created_date';
    const UPDATED_AT = 'updated_date';

    protected $guarded = ['id', 'created_by', 'created_date', 'updated_date'];

    /** The entity name as the API and config/entities.php know it, e.g. "GiftHospitalityDeclaration". */
    public static function entityName(): string
    {
        return class_basename(static::class);
    }

    /** @return array<string, array> */
    public static function schemaFields(): array
    {
        return config('entities.' . static::entityName() . '.fields', []);
    }

    protected function casts(): array
    {
        $casts = [];
        foreach (static::schemaFields() as $name => $field) {
            $cast = match ($field['type']) {
                'array', 'object' => 'array',
                'integer' => 'integer',
                'number' => 'float',
                'boolean' => 'boolean',
                'date' => 'date:Y-m-d',
                'datetime' => 'datetime',
                default => null,
            };
            if ($cast) {
                $casts[$name] = $cast;
            }
        }

        return $casts;
    }
}
