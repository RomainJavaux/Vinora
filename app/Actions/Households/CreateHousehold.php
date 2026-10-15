<?php

namespace App\Actions\Households;

use App\Enums\HouseholdRole;
use App\Models\Household;
use App\Models\User;
use App\Support\Palette;
use Illuminate\Support\Facades\DB;

class CreateHousehold
{
    /**
     * Create a household: its creator becomes the owner, joins it and
     * starts working in it.
     *
     * @param  array{name: string, emoji?: string|null, color?: string|null}  $data
     */
    public function handle(User $user, array $data): Household
    {
        return DB::transaction(function () use ($user, $data) {
            $household = Household::query()->create([
                'name' => $data['name'],
                'emoji' => $data['emoji'] ?? '🏠',
                'color' => $data['color'] ?? Palette::DEFAULT,
                'owner_id' => $user->id,
            ]);

            $household->members()->attach($user->id, ['role' => HouseholdRole::Owner->value]);

            $user->switchHousehold($household);

            return $household;
        });
    }
}
