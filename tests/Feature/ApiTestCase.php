<?php

namespace Tests\Feature;

use App\Models\Access\Permission;
use App\Models\Access\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Feature tests run on in-memory SQLite. The existing staff tables (tab_employees, departments)
 * aren't ours to migrate, so a minimal copy of their columns is created here.
 */
abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected const SALES = '9b053feb-6813-4178-9764-49108bd4a661';

    protected const TECH = '11111111-1111-4111-8111-111111111111';

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('tab_departments', function ($t) {
            $t->string('id')->primary();
            $t->string('name');
        });
        Schema::create('tab_employees', function ($t) {
            $t->string('id')->primary();
            $t->string('department_id')->nullable();
            $t->string('line_manager_id')->nullable();
            $t->string('title')->nullable();
            $t->string('given_names');
            $t->string('family_name');
            $t->string('email')->nullable();
            $t->string('work_number')->nullable();
            $t->string('phone_number')->nullable();
            $t->boolean('disabled')->nullable();
            $t->date('end_date')->nullable();
            $t->timestamp('deleted_at')->nullable();
        });

        DB::table('tab_departments')->insert([['id' => self::SALES, 'name' => 'Sales'], ['id' => self::TECH, 'name' => 'Technology']]);
        $this->employee('e-mark', 'Mark', 'G', 'mg@tabhq.com', self::TECH);
        $this->employee('e-jack', 'Jack', 'Bonner', 'jack@tabhq.com', self::TECH);
        $this->employee('e-sam', 'Sam', 'Sales', 'sam@tabhq.com', self::SALES);
        $this->employee('e-old', 'Old', 'Leaver', 'old@tabhq.com', self::SALES, ['end_date' => '2020-01-01']);
    }

    protected function employee(string $id, string $given, string $family, string $email, ?string $dept, array $extra = []): void
    {
        DB::table('tab_employees')->insert([
            'id' => $id, 'given_names' => $given, 'family_name' => $family, 'email' => $email,
            'department_id' => $dept, 'title' => 'Analyst',
        ] + $extra);
    }

    /** Sign in as $email (via DEV_USER_EMAIL — Cloudflare Access is unconfigured in tests). */
    protected function as(string $email, ?string $role = null, array $sections = []): static
    {
        $email = strtolower($email);
        if ($role) {
            UserRole::updateOrCreate(['email' => $email], ['role' => $role]);
        }
        foreach ($sections as $section => $edit) {
            Permission::create(['email' => $email, 'section' => $section, 'can_view' => true, 'can_edit' => $edit]);
        }
        config(['compliance.access.dev_user_email' => $email]);

        return $this;
    }
}
