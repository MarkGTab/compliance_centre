<?php

namespace App\Models\Compliance;

class Risk extends Entity
{
    protected $table = 'cc_risk';

    protected static function booted(): void
    {
        // Scores are likelihood × impact, worked out here rather than trusted from the browser.
        static::saving(function (Risk $risk) {
            foreach (['inherent', 'residual'] as $kind) {
                $l = $risk->{"{$kind}_likelihood"};
                $i = $risk->{"{$kind}_impact"};
                $risk->{"{$kind}_score"} = ($l && $i) ? $l * $i : null;
            }
        });
    }
}
