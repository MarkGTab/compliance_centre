<?php

namespace App\Services;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/** Validation rules built from config/entities.php. Unknown keys are dropped, not rejected. */
class EntityValidator
{
    public static function validate(string $entity, array $data, bool $creating): array
    {
        $fields = config("entities.$entity.fields", []);
        $data = array_intersect_key($data, $fields);

        $rules = [];
        foreach ($fields as $name => $f) {
            $r = [$creating && $f['required'] ? 'required' : 'nullable'];
            if (! $creating && $f['required']) {
                $r = ['sometimes', 'required'];
            }
            $r = array_merge($r, match ($f['type']) {
                'relation' => ['string', 'max:64'],
                'email' => ['string', 'max:255'],
                'array' => ['array'],
                'object' => ['array'],
                'integer' => array_filter(['integer', isset($f['min']) ? "min:{$f['min']}" : null, isset($f['max']) ? "max:{$f['max']}" : null]),
                'number' => ['numeric'],
                'boolean' => ['boolean'],
                'date' => ['date'],
                'datetime' => ['date'],
                'enum' => [Rule::in($f['values'])],
                'url' => ['string', 'max:2048'],
                'string' => ['string', 'max:255'],
                default => ['string'],
            });
            $rules[$name] = $r;
        }

        return Validator::make($data, $rules)->validate();
    }
}
