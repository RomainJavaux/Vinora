<?php

namespace App\Models;

use App\Enums\HouseholdRole;
use Carbon\CarbonImmutable;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property CarbonImmutable|null $email_verified_at
 * @property string $password
 * @property string|null $remember_token
 * @property int|null $current_household_id
 * @property string|null $anthropic_api_key Personal key used to read labels, encrypted
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Household|null $currentHousehold
 * @property-read Pivot|null $pivot Membership details when loaded through a household
 */
#[Fillable(['name', 'email', 'password', 'current_household_id'])]
#[Hidden(['password', 'remember_token', 'anthropic_api_key'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'anthropic_api_key' => 'encrypted',
        ];
    }

    /**
     * @return BelongsToMany<Household, $this>
     */
    public function households(): BelongsToMany
    {
        return $this->belongsToMany(Household::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * @return BelongsTo<Household, $this>
     */
    public function currentHousehold(): BelongsTo
    {
        return $this->belongsTo(Household::class, 'current_household_id');
    }

    /**
     * Whether this user has set up their own key to read labels. Nobody
     * ever reads labels with someone else's key.
     */
    public function canReadLabels(): bool
    {
        try {
            return is_string($this->anthropic_api_key) && $this->anthropic_api_key !== '';
        } catch (DecryptException) {
            // Saved with another APP_KEY: the user enters it again.
            return false;
        }
    }

    /** The end of the key, to recognise it without showing it: « …a1B2 ». */
    public function anthropicKeyHint(): ?string
    {
        return $this->canReadLabels() ? '…'.substr((string) $this->anthropic_api_key, -4) : null;
    }

    public function belongsToHousehold(Household|int $household): bool
    {
        $id = $household instanceof Household ? $household->id : $household;

        return $this->households()->whereKey($id)->exists();
    }

    public function roleIn(Household $household): ?HouseholdRole
    {
        $role = $this->households()->whereKey($household->id)->first()?->pivot?->getAttribute('role');

        return is_string($role) ? HouseholdRole::tryFrom($role) : null;
    }

    /**
     * Resolve the household the user is currently working in. Falls back on
     * the first household (alphabetically) and remembers it.
     */
    public function resolveCurrentHousehold(): ?Household
    {
        if ($this->current_household_id !== null) {
            $current = $this->households()->whereKey($this->current_household_id)->first();

            if ($current !== null) {
                return $current;
            }
        }

        $first = $this->households()->orderBy('name')->first();

        if ($this->current_household_id !== $first?->id) {
            $this->forceFill(['current_household_id' => $first?->id])->save();
        }

        return $first;
    }

    public function switchHousehold(Household $household): void
    {
        if ($this->current_household_id !== $household->id) {
            $this->forceFill(['current_household_id' => $household->id])->save();
        }

        $this->setRelation('currentHousehold', $household);
    }
}
