<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

/**
 * Translates the Base44 SDK's query arguments into Eloquent, so the frontend's calls keep working:
 *   sort  "-created_date" (desc) / "title" (asc)
 *   filter {"meeting": "<id>", "id": {"$in": [...]}, "value": {"$gte": 3}}
 */
class EntityQuery
{
    private const OPERATORS = ['$eq' => '=', '$ne' => '!=', '$gt' => '>', '$gte' => '>=', '$lt' => '<', '$lte' => '<='];

    /** @param array<string> $fields columns that may be filtered/sorted on */
    public static function apply(Builder $q, array $fields, array $filter = [], ?string $sort = null): Builder
    {
        $allowed = array_merge($fields, ['id', 'created_date', 'updated_date', 'created_by']);

        foreach ($filter as $field => $cond) {
            if (! in_array($field, $allowed, true)) {
                throw ValidationException::withMessages(["filter.$field" => "Unknown field \"$field\"."]);
            }
            if (! is_array($cond)) {
                $cond === null ? $q->whereNull($field) : $q->where($field, $cond);

                continue;
            }
            foreach ($cond as $op => $value) {
                match (true) {
                    $op === '$in' => $q->whereIn($field, (array) $value),
                    $op === '$nin' => $q->whereNotIn($field, (array) $value),
                    isset(self::OPERATORS[$op]) => $value === null
                        ? ($op === '$ne' ? $q->whereNotNull($field) : $q->whereNull($field))
                        : $q->where($field, self::OPERATORS[$op], $value),
                    default => throw ValidationException::withMessages(["filter.$field" => "Unsupported operator \"$op\"."]),
                };
            }
        }

        if ($sort) {
            $dir = str_starts_with($sort, '-') ? 'desc' : 'asc';
            $col = ltrim($sort, '-+');
            if (! in_array($col, $allowed, true)) {
                throw ValidationException::withMessages(['sort' => "Unknown sort field \"$col\"."]);
            }
            $q->orderBy($col, $dir);
        }

        return $q;
    }
}
