<?php

namespace App\Models;

use App\Enums\HouseholdRole;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $household_id
 * @property int|null $invited_by
 * @property string|null $email
 * @property string $token
 * @property HouseholdRole $role
 * @property CarbonImmutable $expires_at
 * @property CarbonImmutable|null $accepted_at
 * @property int|null $accepted_by
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Household $household
 * @property-read User|null $inviter
 */
#[Fillable(['household_id', 'invited_by', 'email', 'token', 'role', 'expires_at', 'accepted_at', 'accepted_by'])]
class HouseholdInvitation extends Model
{
    public const VALID_DAYS = 7;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => HouseholdRole::class,
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Household, $this>
     */
    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    /**
     * @param  Builder<HouseholdInvitation>  $query
     * @return Builder<HouseholdInvitation>
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->whereNull('accepted_at')->where('expires_at', '>', now());
    }

    public function status(): string
    {
        return match (true) {
            $this->accepted_at !== null => 'accepted',
            $this->expires_at->isPast() => 'expired',
            default => 'pending',
        };
    }

    public function url(): string
    {
        return route('invitations.show', $this->token);
    }
}
