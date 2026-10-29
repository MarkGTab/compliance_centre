<?php

namespace Database\Seeders;

use App\Models\Access\Setting;
use App\Models\Access\UserRole;
use App\Models\Compliance\Committee;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Reference data only — Base44 held test data, so nothing is migrated from it. Safe to re-run.
     * Risk categories and appetite are left for the risk team to enter (or import) with real values.
     */
    public function run(): void
    {
        UserRole::firstOrCreate(
            ['email' => strtolower(config('compliance.first_admin'))],
            ['role' => 'admin', 'created_by' => 'seeder'],
        );

        foreach (['Board', 'Board Risk Committee', 'ERC', 'Credit Committee'] as $name) {
            Committee::firstOrCreate(['name' => $name], ['created_by' => 'seeder']);
        }

        foreach (['mail_from_address' => 'compliance@tabhq.com', 'mail_from_name' => 'TAB Compliance'] as $key => $value) {
            if (Setting::find($key) === null) {
                Setting::put($key, $value, false, 'seeder');
            }
        }
    }
}
