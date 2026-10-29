<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Additive only: creates the compliance app's own cc_* tables, never touches existing ones.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cc_action', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('bucket', 64)->nullable();
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->string('last_modified_by')->nullable();
            $table->dateTime('last_modified_date')->nullable();
            $table->uuid('linked_risk')->nullable()->index();
            $table->uuid('owner')->nullable()->index();
            $table->string('priority', 64)->nullable();
            $table->string('status', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_appetite', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('appetite_level', 64)->nullable();
            $table->uuid('category')->nullable()->index();
            $table->integer('max_residual_score')->nullable();
            $table->text('metric')->nullable();
            $table->text('qualitative_statement')->nullable();
            $table->text('threshold')->nullable();
            $table->integer('tolerance_score')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_attendance', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('attendance_status', 64)->nullable();
            $table->uuid('invitee')->nullable()->index();
            $table->uuid('linked_conflict')->nullable()->index();
            $table->uuid('meeting')->nullable()->index();
            $table->text('recusal_reason')->nullable();
            $table->string('role_at_meeting', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_attestation_campaign', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('allow_exceptions', 64)->nullable();
            $table->json('audience')->nullable();
            $table->json('audience_departments')->nullable();
            $table->json('audience_roles')->nullable();
            $table->string('campaign_ref')->nullable();
            $table->date('due_date')->nullable();
            $table->string('frequency', 64)->nullable();
            $table->date('issue_date')->nullable();
            $table->string('last_modified_by')->nullable();
            $table->dateTime('last_modified_date')->nullable();
            $table->uuid('linked_control')->nullable()->index();
            $table->uuid('linked_policy')->nullable()->index();
            $table->uuid('linked_risk')->nullable()->index();
            $table->uuid('owner')->nullable()->index();
            $table->text('statement')->nullable();
            $table->string('status', 64)->nullable();
            $table->string('title')->nullable();
            $table->string('type', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_attestation_response', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('campaign')->nullable()->index();
            $table->uuid('employee')->nullable()->index();
            $table->text('exception_detail')->nullable();
            $table->uuid('linked_action')->nullable()->index();
            $table->uuid('linked_conflict')->nullable()->index();
            $table->boolean('locked')->default(false);
            $table->string('recipient_email')->nullable();
            $table->string('response_ref')->nullable();
            $table->string('response_type', 64)->nullable();
            $table->string('signature_name')->nullable();
            $table->dateTime('signed_datetime')->nullable();
            $table->string('status', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_board_action', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('assignee')->nullable()->index();
            $table->date('completed_date')->nullable();
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->text('follow_up_notes')->nullable();
            $table->uuid('linked_policy')->nullable()->index();
            $table->uuid('linked_risk')->nullable()->index();
            $table->uuid('meeting')->nullable()->index();
            $table->string('priority', 64)->nullable();
            $table->string('status', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_change_log', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('action', 64)->nullable();
            $table->text('changes')->nullable();
            $table->string('entity', 64)->nullable();
            $table->string('record_id')->nullable();
            $table->string('record_ref')->nullable();
            $table->dateTime('timestamp')->nullable();
            $table->string('user')->nullable();
            $table->string('user_name')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_committee', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('description')->nullable();
            $table->string('name', 64)->nullable();
            $table->integer('quorum')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_conflict_of_interest', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->date('date_identified')->nullable();
            $table->text('mitigation')->nullable();
            $table->text('nature_of_conflict')->nullable();
            $table->string('person')->nullable();
            $table->uuid('raised_by')->nullable()->index();
            $table->text('related_parties')->nullable();
            $table->date('review_date')->nullable();
            $table->uuid('source_attestation')->nullable()->index();
            $table->string('status', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_control', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('control_ref')->nullable();
            $table->uuid('department')->nullable()->index();
            $table->text('description')->nullable();
            $table->string('design_effectiveness', 64)->nullable();
            $table->string('evidence_link', 2048)->nullable();
            $table->string('last_modified_by')->nullable();
            $table->dateTime('last_modified_date')->nullable();
            $table->date('last_tested')->nullable();
            $table->json('linked_risks')->nullable();
            $table->string('operating_effectiveness', 64)->nullable();
            $table->uuid('owner')->nullable()->index();
            $table->string('test_frequency')->nullable();
            $table->string('type', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_decision', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('decision_text')->nullable();
            $table->string('decision_type', 64)->nullable();
            $table->uuid('meeting')->nullable()->index();
            $table->uuid('related_policy')->nullable()->index();
            $table->uuid('related_risk')->nullable()->index();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_decision_recusal', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('decision')->nullable()->index();
            $table->uuid('employee')->nullable()->index();
            $table->uuid('linked_conflict')->nullable()->index();
            $table->text('reason')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_emerging_risk', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('description')->nullable();
            $table->string('likelihood_horizon', 64)->nullable();
            $table->uuid('owner')->nullable()->index();
            $table->text('potential_impact')->nullable();
            $table->string('theme')->nullable();
            $table->string('watch_status', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_gift_hospitality_declaration', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->decimal('applicable_threshold', 20, 4)->nullable();
            $table->date('approval_date')->nullable();
            $table->uuid('approver')->nullable()->index();
            $table->string('compliance_status', 64)->nullable();
            $table->string('counterparty')->nullable();
            $table->string('counterparty_relationship', 64)->nullable();
            $table->boolean('cumulative_flag')->default(false);
            $table->decimal('cumulative_value', 20, 4)->nullable();
            $table->date('date')->nullable();
            $table->string('declaration_ref')->nullable();
            $table->text('description')->nullable();
            $table->string('direction', 64)->nullable();
            $table->uuid('employee')->nullable()->index();
            $table->decimal('estimated_value', 20, 4)->nullable();
            $table->uuid('governing_policy')->nullable()->index();
            $table->string('governing_policy_name')->nullable();
            $table->text('governing_policy_version')->nullable();
            $table->string('last_modified_by')->nullable();
            $table->dateTime('last_modified_date')->nullable();
            $table->uuid('linked_conflict')->nullable()->index();
            $table->text('mitigation_notes')->nullable();
            $table->string('prior_approval_obtained', 64)->nullable();
            $table->string('prior_approval_required', 64)->nullable();
            $table->text('purpose')->nullable();
            $table->string('status', 64)->nullable();
            $table->string('type', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_incident', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('category')->nullable()->index();
            $table->date('date')->nullable();
            $table->text('description')->nullable();
            $table->decimal('financial_impact', 20, 4)->nullable();
            $table->string('incident_ref')->nullable();
            $table->string('last_modified_by')->nullable();
            $table->dateTime('last_modified_date')->nullable();
            $table->text('lessons_learned_status')->nullable();
            $table->uuid('linked_risk')->nullable()->index();
            $table->text('remediation_status')->nullable();
            $table->text('root_cause')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_insurance_policy', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('broker')->nullable();
            $table->string('cover_type', 64)->nullable();
            $table->decimal('excess', 20, 4)->nullable();
            $table->date('expiry_date')->nullable();
            $table->date('inception_date')->nullable();
            $table->string('insurer')->nullable();
            $table->text('key_exclusions')->nullable();
            $table->decimal('limit_of_indemnity', 20, 4)->nullable();
            $table->json('linked_risks')->nullable();
            $table->uuid('owner')->nullable()->index();
            $table->string('policy_name')->nullable();
            $table->string('policy_number')->nullable();
            $table->decimal('premium', 20, 4)->nullable();
            $table->text('purpose')->nullable();
            $table->string('renewal_frequency', 64)->nullable();
            $table->string('status', 64)->nullable();
            $table->text('summary')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_kri', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('amber_threshold')->nullable();
            $table->decimal('amber_trigger', 20, 4)->nullable();
            $table->text('current_value')->nullable();
            $table->decimal('current_value_num', 20, 4)->nullable();
            $table->string('data_source')->nullable();
            $table->string('direction', 64)->nullable();
            $table->string('frequency')->nullable();
            $table->text('green_threshold')->nullable();
            $table->string('indicator')->nullable();
            $table->date('last_updated')->nullable();
            $table->uuid('linked_category')->nullable()->index();
            $table->uuid('linked_risk')->nullable()->index();
            $table->date('next_update_due')->nullable();
            $table->uuid('owner')->nullable()->index();
            $table->text('red_threshold')->nullable();
            $table->decimal('red_trigger', 20, 4)->nullable();
            $table->string('trend', 64)->nullable();
            $table->string('unit', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_kri_reading', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('commentary')->nullable();
            $table->uuid('kri')->nullable()->index();
            $table->date('period_date')->nullable();
            $table->string('rag', 64)->nullable();
            $table->string('recorded_by')->nullable();
            $table->decimal('value', 20, 4)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_meeting', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('agenda')->nullable();
            $table->json('apologies')->nullable();
            $table->json('attendees')->nullable();
            $table->uuid('chair')->nullable()->index();
            $table->string('committee', 64)->nullable();
            $table->date('date')->nullable();
            $table->string('location')->nullable();
            $table->text('minutes')->nullable();
            $table->date('next_meeting_date')->nullable();
            $table->integer('required_quorum')->nullable();
            $table->string('status', 64)->nullable();
            $table->string('title')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_policy', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->decimal('absolute_prohibition_limit', 20, 4)->nullable();
            $table->date('approval_date')->nullable();
            $table->string('approved_by')->nullable();
            $table->decimal('cumulative_limit', 20, 4)->nullable();
            $table->uuid('department')->nullable()->index();
            $table->decimal('gift_approval_threshold', 20, 4)->nullable();
            $table->string('governs_gh_register', 64)->nullable();
            $table->decimal('hospitality_approval_threshold', 20, 4)->nullable();
            $table->date('limits_effective_date')->nullable();
            $table->date('next_review_date')->nullable();
            $table->uuid('owner')->nullable()->index();
            $table->string('policy_name')->nullable();
            $table->string('review_frequency', 64)->nullable();
            $table->string('status', 64)->nullable();
            $table->text('summary')->nullable();
            $table->string('version')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_report_definition', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('columns')->nullable();
            $table->text('filters')->nullable();
            $table->dateTime('last_run')->nullable();
            $table->string('name')->nullable();
            $table->string('schedule_format', 64)->nullable();
            $table->string('schedule_frequency', 64)->nullable();
            $table->json('schedule_recipients')->nullable();
            $table->string('sort_direction', 64)->nullable();
            $table->text('sort_field')->nullable();
            $table->string('source', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_risk', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('appetite_status', 64)->nullable();
            $table->uuid('category')->nullable()->index();
            $table->text('cause')->nullable();
            $table->text('consequence')->nullable();
            $table->uuid('department')->nullable()->index();
            $table->text('description')->nullable();
            $table->text('event')->nullable();
            $table->integer('inherent_impact')->nullable();
            $table->integer('inherent_likelihood')->nullable();
            $table->integer('inherent_score')->nullable();
            $table->text('initiative')->nullable();
            $table->string('last_modified_by')->nullable();
            $table->dateTime('last_modified_date')->nullable();
            $table->date('last_reviewed')->nullable();
            $table->date('next_review')->nullable();
            $table->uuid('owner')->nullable()->index();
            $table->uuid('parent_risk')->nullable()->index();
            $table->string('project_status', 64)->nullable();
            $table->integer('residual_impact')->nullable();
            $table->integer('residual_likelihood')->nullable();
            $table->integer('residual_score')->nullable();
            $table->string('risk_ref')->nullable();
            $table->string('status', 64)->nullable();
            $table->date('target_date')->nullable();
            $table->decimal('target_score', 20, 4)->nullable();
            $table->string('tier', 64)->nullable();
            $table->string('title')->nullable();
            $table->string('trend', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_risk_category', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('appetite_position')->nullable();
            $table->uuid('category_owner')->nullable()->index();
            $table->text('definition')->nullable();
            $table->string('name')->nullable();
            $table->string('rag', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_standing_member', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->boolean('active')->default(false);
            $table->uuid('committee')->nullable()->index();
            $table->uuid('employee')->nullable()->index();
            $table->string('role_at_meeting', 64)->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

        Schema::create('cc_third_party', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('contract_owner')->nullable()->index();
            $table->string('criticality', 64)->nullable();
            $table->string('provider')->nullable();
            $table->date('review_date')->nullable();
            $table->string('risk_rating', 64)->nullable();
            $table->text('service')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable()->index();
            $table->timestamp('updated_date')->nullable();
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('cc_third_party');
        Schema::dropIfExists('cc_standing_member');
        Schema::dropIfExists('cc_risk_category');
        Schema::dropIfExists('cc_risk');
        Schema::dropIfExists('cc_report_definition');
        Schema::dropIfExists('cc_policy');
        Schema::dropIfExists('cc_meeting');
        Schema::dropIfExists('cc_kri_reading');
        Schema::dropIfExists('cc_kri');
        Schema::dropIfExists('cc_insurance_policy');
        Schema::dropIfExists('cc_incident');
        Schema::dropIfExists('cc_gift_hospitality_declaration');
        Schema::dropIfExists('cc_emerging_risk');
        Schema::dropIfExists('cc_decision_recusal');
        Schema::dropIfExists('cc_decision');
        Schema::dropIfExists('cc_control');
        Schema::dropIfExists('cc_conflict_of_interest');
        Schema::dropIfExists('cc_committee');
        Schema::dropIfExists('cc_change_log');
        Schema::dropIfExists('cc_board_action');
        Schema::dropIfExists('cc_attestation_response');
        Schema::dropIfExists('cc_attestation_campaign');
        Schema::dropIfExists('cc_attendance');
        Schema::dropIfExists('cc_appetite');
        Schema::dropIfExists('cc_action');
    }
};
