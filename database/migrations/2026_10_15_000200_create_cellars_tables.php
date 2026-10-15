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
        Schema::create('cellars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->string('type', 20);
            $table->string('color', 20)->default('bordeaux');
            $table->string('location', 60)->nullable();
            $table->text('notes')->nullable();
            $table->decimal('temperature', 4, 1)->nullable();
            $table->unsignedTinyInteger('humidity')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('compartments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cellar_id')->constrained()->cascadeOnDelete();
            $table->string('name', 40);
            $table->string('color', 20)->nullable();
            $table->unsignedSmallInteger('capacity')->nullable();
            $table->unsignedInteger('position')->default(1);
            $table->timestamps();
        });

        Schema::create('wines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('compartment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->string('name', 120);
            $table->string('producer', 120)->nullable();
            $table->string('category', 20);
            $table->unsignedSmallInteger('vintage')->nullable();
            $table->string('appellation', 120)->nullable();
            $table->string('region', 60)->nullable();
            $table->string('country', 60)->nullable();
            $table->json('grapes')->nullable();
            $table->decimal('alcohol', 4, 1)->nullable();
            $table->text('description')->nullable();
            $table->string('photo_path')->nullable();

            $table->unsignedInteger('quantity');
            $table->unsignedInteger('initial_quantity');
            $table->string('format', 20)->default('standard');

            $table->unsignedInteger('price_cents')->nullable();
            $table->unsignedInteger('value_cents')->nullable();
            $table->date('purchased_on')->nullable();
            $table->string('bought_from', 80)->nullable();

            $table->string('aging', 20)->nullable();
            $table->unsignedSmallInteger('drink_from')->nullable();
            $table->unsignedSmallInteger('drink_until')->nullable();

            $table->json('tags')->nullable();
            $table->decimal('rating', 2, 1)->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['household_id', 'finished_at']);
            $table->index(['household_id', 'drink_until']);
        });

        Schema::create('wine_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('wine_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 20);
            $table->string('wine_name', 120);
            $table->unsignedSmallInteger('wine_vintage')->nullable();
            $table->string('wine_category', 20);
            $table->unsignedInteger('quantity')->nullable();
            $table->foreignId('from_compartment_id')->nullable()->constrained('compartments')->nullOnDelete();
            $table->foreignId('to_compartment_id')->nullable()->constrained('compartments')->nullOnDelete();
            $table->unsignedTinyInteger('rating')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['household_id', 'created_at']);
            $table->index(['household_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wine_movements');
        Schema::dropIfExists('wines');
        Schema::dropIfExists('compartments');
        Schema::dropIfExists('cellars');
    }
};
