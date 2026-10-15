<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('households', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60);
            $table->string('emoji', 16)->default('🏠');
            $table->string('color', 20)->default('bordeaux');
            $table->boolean('share_prices')->default(true);
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('household_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20)->default('member');
            $table->timestamps();

            $table->unique(['household_id', 'user_id']);
        });

        Schema::create('household_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('email')->nullable();
            $table->string('token', 64)->unique();
            $table->string('role', 20)->default('member');
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('current_household_id')
                ->nullable()
                ->after('remember_token')
                ->constrained('households')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('current_household_id');
        });

        Schema::dropIfExists('household_invitations');
        Schema::dropIfExists('household_user');
        Schema::dropIfExists('households');
    }
};
