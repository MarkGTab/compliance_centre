<?php

namespace Tests\Feature;

use App\Models\Access\DepartmentSettings;
use App\Models\Compliance\ChangeLog;
use App\Models\Compliance\Control;
use App\Models\Compliance\GiftHospitalityDeclaration;
use App\Models\Compliance\Risk;

class EntityApiTest extends ApiTestCase
{
    public function test_requires_a_signed_in_viewer(): void
    {
        $this->getJson('/api/me')->assertStatus(401);
        $this->getJson('/api/entities/Risk')->assertStatus(401);
    }

    public function test_me_links_the_identity_to_the_staff_record(): void
    {
        $this->as('MG@tabhq.com', 'admin')->getJson('/api/me')
            ->assertOk()
            ->assertJson(['email' => 'mg@tabhq.com', 'role' => 'admin', 'employee_id' => 'e-mark', 'full_name' => 'Mark G']);
    }

    public function test_unknown_staff_default_to_read_only(): void
    {
        $this->as('nobody@tabhq.com')->getJson('/api/me')->assertOk()->assertJson(['role' => 'read_only', 'employee_id' => null]);
    }

    public function test_admin_creates_a_risk_with_server_side_scores_and_audit_trail(): void
    {
        $res = $this->as('mg@tabhq.com', 'admin')->postJson('/api/entities/Risk', [
            'title' => 'Liquidity', 'inherent_likelihood' => 4, 'inherent_impact' => 5,
            'residual_likelihood' => 2, 'residual_impact' => 3, 'inherent_score' => 999,
            'department' => self::TECH, 'not_a_field' => 'ignored',
        ])->assertCreated()
            ->assertJson(['title' => 'Liquidity', 'inherent_score' => 20, 'residual_score' => 6,
                'created_by' => 'mg@tabhq.com', 'last_modified_by' => 'mg@tabhq.com'])
            ->assertJsonMissing(['not_a_field' => 'ignored']);

        $log = ChangeLog::sole();
        $this->assertSame(['created', 'Risk', $res->json('id'), 'mg@tabhq.com'], [$log->action, $log->entity, $log->record_id, $log->user]);

        $this->putJson('/api/entities/Risk/'.$res->json('id'), ['inherent_impact' => 1])
            ->assertOk()->assertJson(['inherent_score' => 4]);
        $update = ChangeLog::where('action', 'updated')->sole();
        $this->assertSame(['from' => 20, 'to' => 4], json_decode($update->changes, true)['inherent_score']);
    }

    public function test_validation_uses_the_entity_schema(): void
    {
        $this->as('mg@tabhq.com', 'admin');
        $this->postJson('/api/entities/Risk', ['status' => 'Open'])->assertStatus(422)->assertJsonValidationErrors('title');
        $this->postJson('/api/entities/Risk', ['title' => 'x', 'status' => 'Nope'])->assertStatus(422)->assertJsonValidationErrors('status');
        $this->postJson('/api/entities/Risk', ['title' => 'x', 'inherent_impact' => 9])->assertStatus(422)->assertJsonValidationErrors('inherent_impact');
        $this->getJson('/api/entities/NotAThing')->assertStatus(404);
    }

    public function test_read_only_cannot_write(): void
    {
        $this->as('sam@tabhq.com', 'read_only', ['Risk Register' => true]);
        $this->postJson('/api/entities/Risk', ['title' => 'x'])->assertStatus(403);
    }

    public function test_risk_team_needs_section_edit_permission(): void
    {
        $this->as('jack@tabhq.com', 'risk_team');
        $this->postJson('/api/entities/Risk', ['title' => 'x'])->assertStatus(403);

        $this->as('jack@tabhq.com', null, ['Risk Register' => true]);
        $this->postJson('/api/entities/Risk', ['title' => 'x'])->assertCreated();
        // …but risk_team still can't touch admin-only registers.
        $this->as('jack@tabhq.com', null, ['Policy Suite' => true]);
        $this->postJson('/api/entities/Policy', ['policy_name' => 'x'])->assertStatus(403);
    }

    public function test_department_head_is_scoped_to_their_department(): void
    {
        DepartmentSettings::create(['department_id' => self::SALES, 'head' => 'e-sam']);
        $own = Risk::create(['title' => 'own', 'department' => self::SALES]);
        $other = Risk::create(['title' => 'other', 'department' => self::TECH]);

        $this->as('sam@tabhq.com', 'department_head', ['Risk Register' => true, 'Actions Tracker' => true]);
        $this->putJson("/api/entities/Risk/{$own->id}", ['status' => 'Monitoring'])->assertOk();
        $this->putJson("/api/entities/Risk/{$other->id}", ['status' => 'Monitoring'])->assertStatus(403);
        $this->putJson("/api/entities/Risk/{$own->id}", ['department' => self::TECH])->assertStatus(403);
        $this->postJson('/api/entities/Risk', ['title' => 'new', 'department' => self::TECH])->assertStatus(403);
        $this->postJson('/api/entities/Risk', ['title' => 'new', 'department' => self::SALES])->assertCreated();

        // Actions inherit their risk's department.
        $this->postJson('/api/entities/Action', ['description' => 'a', 'linked_risk' => $own->id])->assertCreated();
        $this->postJson('/api/entities/Action', ['description' => 'b', 'linked_risk' => $other->id])->assertStatus(403);
        $this->deleteJson("/api/entities/Risk/{$own->id}")->assertStatus(403);
    }

    public function test_personal_registers_are_restricted_to_the_section_or_your_own_rows(): void
    {
        GiftHospitalityDeclaration::create(['declaration_ref' => 'G1', 'employee' => 'e-sam']);
        GiftHospitalityDeclaration::create(['declaration_ref' => 'G2', 'employee' => 'e-jack']);
        GiftHospitalityDeclaration::create(['declaration_ref' => 'G3', 'employee' => 'e-mark', 'approver' => 'e-sam']);

        $this->as('sam@tabhq.com', 'read_only');
        $this->assertEqualsCanonicalizing(['G1', 'G3'], collect($this->getJson('/api/entities/GiftHospitalityDeclaration')->json())->pluck('declaration_ref')->all());
        $g2 = GiftHospitalityDeclaration::where('declaration_ref', 'G2')->value('id');
        $this->getJson("/api/entities/GiftHospitalityDeclaration/$g2")->assertNotFound();
        $this->getJson('/api/entities/ChangeLog')->assertOk()->assertExactJson([]);

        $this->as('sam@tabhq.com', null, ['Gifts & Hospitality' => false]);
        $this->assertCount(3, $this->getJson('/api/entities/GiftHospitalityDeclaration')->json());

        // Somebody with no staff record sees none of it.
        $this->as('nobody@tabhq.com');
        $this->getJson('/api/entities/GiftHospitalityDeclaration')->assertExactJson([]);
    }

    public function test_list_filter_sort_and_limit_match_the_old_sdk(): void
    {
        foreach (['b' => 2, 'a' => 1, 'c' => 3] as $t => $n) {
            Risk::create(['title' => $t, 'inherent_likelihood' => $n, 'inherent_impact' => 1, 'status' => $n > 1 ? 'Open' : 'Closed']);
        }
        $this->as('sam@tabhq.com');
        $titles = fn ($q) => collect($this->getJson("/api/entities/Risk?$q")->assertOk()->json())->pluck('title')->all();

        $this->assertSame(['c', 'b', 'a'], $titles('sort=-inherent_score'));
        $this->assertSame(['a'], $titles('sort=title&limit=1'));
        $this->assertSame(['b', 'c'], $titles('sort=title&filter='.urlencode('{"status":"Open"}')));
        $this->assertSame(['a', 'c'], $titles('sort=title&filter='.urlencode('{"title":{"$in":["a","c"]}}')));
        $this->assertSame(['c'], $titles('filter='.urlencode('{"inherent_score":{"$gte":3}}')));
        $this->getJson('/api/entities/Risk?filter='.urlencode('{"nope":1}'))->assertStatus(422);
    }

    public function test_bulk_create_bulk_update_and_update_many_array_operators(): void
    {
        $this->as('mg@tabhq.com', 'admin');
        $created = $this->postJson('/api/entities/Control/bulk', [
            ['control_ref' => 'C1', 'description' => 'one'],
            ['control_ref' => 'C2', 'description' => 'two', 'linked_risks' => ['r1']],
        ])->assertCreated()->json();
        $ids = array_column($created, 'id');

        $this->putJson('/api/entities/Control/bulk', [['id' => $ids[0], 'type' => 'Detective']])->assertOk();
        $this->assertSame('Detective', Control::find($ids[0])->type);

        $this->postJson('/api/entities/Control/update-many', [
            'filter' => ['id' => ['$in' => $ids]], 'update' => ['$addToSet' => ['linked_risks' => 'r1']],
        ])->assertOk()->assertJson(['updated' => 2]);
        $this->assertSame([['r1'], ['r1']], [Control::find($ids[0])->linked_risks, Control::find($ids[1])->linked_risks]);

        $this->postJson('/api/entities/Control/update-many', [
            'filter' => ['id' => ['$in' => [$ids[1]]]], 'update' => ['$pull' => ['linked_risks' => 'r1']],
        ])->assertOk();
        $this->assertSame([], Control::find($ids[1])->linked_risks);
    }

    public function test_the_audit_trail_is_server_only(): void
    {
        $this->as('mg@tabhq.com', 'admin');
        $this->postJson('/api/entities/ChangeLog', ['action' => 'created', 'entity' => 'Risk'])->assertStatus(403);
    }
}
