<?php

namespace App\Models;

use App\Enums\HouseholdRole;
use Carbon\CarbonImmutable;
use Database\Factories\HouseholdFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A "lieu": a home sharing one or more cellars between its members.
 *
 * @property int $id
 * @property string $name
 * @property string $emoji
 * @property string $color
 * @property bool $share_prices
 * @property int $owner_id
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['name', 'emoji', 'color', 'share_prices', 'owner_id'])]
class Household extends Model
{
    /** @use HasFactory<HouseholdFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'share_prices' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * @return HasMany<Cellar, $this>
     */
    public function cellars(): HasMany
    {
        return $this->hasMany(Cellar::class)->orderBy('position')->orderBy('id');
    }

    /**
     * @return HasMany<Wine, $this>
     */
    public function wines(): HasMany
    {
        return $this->hasMany(Wine::class);
    }

    /**
     * @return HasMany<WineMovement, $this>
     */
    public function movements(): HasMany
    {
        return $this->hasMany(WineMovement::class);
    }

    /**
     * @return HasMany<HouseholdInvitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(HouseholdInvitation::class);
    }

    public function roleOf(User $user): ?HouseholdRole
    {
        $member = $this->members()->whereKey($user->id)->first();
        $role = $member?->pivot?->getAttribute('role');

        return is_string($role) ? HouseholdRole::tryFrom($role) : null;
    }

    /**
     * Whether the user may see purchase prices and values in this household.
     */
    public function pricesVisibleTo(User $user): bool
    {
        return $this->share_prices || ($this->roleOf($user)?->canManage() ?? false);
    }

    /**
     * Compartment ids of every cellar of this household.
     *
     * @return list<int>
     */
    public function compartmentIds(): array
    {
        return array_values(Compartment::query()
            ->whereIn('cellar_id', $this->cellars()->select('id'))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all());
    }
}
