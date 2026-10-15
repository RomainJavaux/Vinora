<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command->warn('Les données de démonstration ne sont jamais créées en production.');

            return;
        }

        $this->call(DemoSeeder::class);
    }
}
