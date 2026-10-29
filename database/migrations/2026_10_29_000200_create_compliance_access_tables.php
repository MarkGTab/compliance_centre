<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Additive only. People and departments live in the existing tab_employees / departments tables;
// these hold just what the compliance app adds on top of them.
return new class extends Migration
{
    public function up(): void
    {
        // Replaces Base44 User.role. Keyed by the Cloudflare Access email.
        Schema::create('cc_user_role', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('role', 32); // admin | risk_team | department_head | read_only
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable();
            $table->timestamp('updated_date')->nullable();
        });

        // Replaces Base44 Permission (per person, per section).
        Schema::create('cc_permission', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email')->index();
            $table->string('section', 64);
            $table->boolean('can_view')->default(false);
            $table->boolean('can_edit')->default(false);
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable();
            $table->timestamp('updated_date')->nullable();
            $table->unique(['email', 'section']);
        });

        // The Base44 Department fields the existing departments table doesn't have.
        Schema::create('cc_department_settings', function (Blueprint $table) {
            $table->uuid('department_id')->primary();
            $table->uuid('head')->nullable()->index(); // tab_employees.id
            $table->string('line_of_defence', 16)->nullable(); // First | Second | Third
            $table->text('description')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_date')->nullable();
            $table->timestamp('updated_date')->nullable();
        });

        // Admin-editable settings: sender mailbox, Teams webhook, …
        Schema::create('cc_setting', function (Blueprint $table) {
            $table->string('key', 64)->primary();
            $table->text('value')->nullable();
            $table->boolean('encrypted')->default(false);
            $table->string('updated_by')->nullable();
            $table->timestamp('updated_date')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cc_setting');
        Schema::dropIfExists('cc_department_settings');
        Schema::dropIfExists('cc_permission');
        Schema::dropIfExists('cc_user_role');
    }
};
