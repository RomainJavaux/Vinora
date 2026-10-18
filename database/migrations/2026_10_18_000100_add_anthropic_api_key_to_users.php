<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Each user brings their own Anthropic key to read labels; it is stored
     * encrypted with the application key.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('anthropic_api_key')->nullable()->after('remember_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('anthropic_api_key');
        });
    }
};
