<?php

namespace Tests\Feature;

use App\Models\Access\Permission;
use App\Models\Access\UserRole;
use App\Models\Compliance\ChangeLog;

class PeopleAndAccessTest extends ApiTestCase
{
    public function test_employees_come_from_tab_employees_in_the_old_shape(): void
    {
        $rows = collect($this->as('sam@tabhq.com')->getJson('/api/entities/Employee')->assertOk()->json())->keyBy('id');

        $this->assertSame([
            'id' => 'e-jack', 'full_name' => 'Jack Bonner', 'email' => 'jack@tabhq.com', 'job_title' => 'Analyst',
            'department' => self::TECH, 'line_manager' => null, 'mobile' => null, 'status' => 'Active',
        ], $rows['e-jack']);
        $this->assertSame('Leaver', $rows['e-old']['status']);

        $this->assertSame(['e-mark'], collect($this->getJson('/api/entities/Employee?filter='.urlencode('{"email":"MG@tabhq.com"}'))->json())->pluck('id')->all());
    }

    public function test_departments_merge_the_compliance_extras_and_only_admins_edit_them(): void
    {
        $this->as('sam@tabhq.com', 'risk_team');
        $this->putJson('/api/entities/Department/'.self::SALES, ['head' => 'e-sam'])->assertStatus(403);

        $this->as('mg@tabhq.com', 'admin');
        $this->putJson('/api/entities/Department/'.self::SALES, ['head' => 'e-sam', 'line_of_defence' => 'First'])
            ->assertOk()->assertJson(['id' => self::SALES, 'name' => 'Sales', 'head' => 'e-sam', 'line_of_defence' => 'First']);
        $this->getJson('/api/entities/Department')->assertOk()->assertJsonFragment(['name' => 'Technology', 'head' => null]);
    }

    public function test_save_permissions_is_admin_only_audited_and_not_on_yourself(): void
    {
        $body = ['target_user' => 'jack@tabhq.com', 'permissions' => [
            ['section' => 'Risk Register', 'can_view' => 'Yes', 'can_edit' => 'Yes'],
            ['section' => 'Controls', 'can_view' => 'Yes', 'can_edit' => 'No'],
            ['section' => 'Incidents & Loss', 'can_view' => 'No', 'can_edit' => 'Yes'],
        ]];

        $this->as('sam@tabhq.com', 'risk_team')->postJson('/api/functions/savePermissions', $body)->assertStatus(403);

        $this->as('mg@tabhq.com', 'admin')->postJson('/api/functions/savePermissions', $body)->assertOk()->assertJson(['changes' => 2]);
        $this->assertEqualsCanonicalizing(['Risk Register', 'Controls'], Permission::where('email', 'jack@tabhq.com')->pluck('section')->all());
        $this->assertSame('Permission', ChangeLog::sole()->entity);

        $this->postJson('/api/functions/savePermissions', ['target_user' => 'mg@tabhq.com', 'permissions' => []])->assertStatus(422);

        // Old-shape read: admins see anyone's, others only their own.
        $this->getJson('/api/entities/Permission?filter='.urlencode('{"user":"jack@tabhq.com"}'))
            ->assertOk()->assertJsonFragment(['section' => 'Controls', 'can_view' => 'Yes', 'can_edit' => 'No']);
        $this->as('sam@tabhq.com')->getJson('/api/entities/Permission?filter='.urlencode('{"user":"jack@tabhq.com"}'))->assertExactJson([]);
    }

    public function test_roles_are_admin_managed_and_you_cannot_change_your_own(): void
    {
        $this->as('mg@tabhq.com', 'admin');
        $this->putJson('/api/roles', ['email' => 'Jack@tabhq.com', 'role' => 'risk_team'])->assertOk();
        $this->assertSame('risk_team', UserRole::find('jack@tabhq.com')->role);
        $this->putJson('/api/roles', ['email' => 'mg@tabhq.com', 'role' => 'read_only'])->assertStatus(422);

        $this->as('jack@tabhq.com')->putJson('/api/roles', ['email' => 'sam@tabhq.com', 'role' => 'admin'])->assertStatus(403);
    }
}
