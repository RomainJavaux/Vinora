<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bottles can be stored one behind the other: the number of rows in
     * depth multiplies the capacity of every compartment.
     */
    public function up(): void
    {
        Schema::table('cellars', function (Blueprint $table) {
            $table->unsignedTinyInteger('depth')->default(1)->after('humidity');
        });
    }

    public function down(): void
    {
        Schema::table('cellars', function (Blueprint $table) {
            $table->dropColumn('depth');
        });
    }
};
