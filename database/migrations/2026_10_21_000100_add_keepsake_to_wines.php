<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A bottle kept rather than drunk (gift, souvenir, collection): it is
     * never suggested.
     */
    public function up(): void
    {
        Schema::table('wines', function (Blueprint $table) {
            $table->boolean('keepsake')->default(false)->after('drink_until');
        });
    }

    public function down(): void
    {
        Schema::table('wines', function (Blueprint $table) {
            $table->dropColumn('keepsake');
        });
    }
};
