<?php

namespace App\Http\Controllers;

use App\Http\Middleware\EnsureUserHasHousehold;
use App\Models\Household;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Inertia\Inertia;

abstract class Controller
{
    use AuthorizesRequests;

    /**
     * The household the user currently works in (set by the middleware).
     */
    protected function household(Request $request): Household
    {
        $household = $request->attributes->get(EnsureUserHasHousehold::ATTRIBUTE);

        if ($household instanceof Household) {
            return $household;
        }

        $household = $this->user($request)->resolveCurrentHousehold();

        abort_if($household === null, 403);

        $request->attributes->set(EnsureUserHasHousehold::ATTRIBUTE, $household);

        return $household;
    }

    protected function user(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }

    protected function toast(string $message, string $type = 'success'): void
    {
        Inertia::flash('toast', ['type' => $type, 'message' => $message]);
    }

    protected function celebrate(): void
    {
        Inertia::flash('celebrate', true);
    }

    /**
     * When the user opens a record of another of their households, switch
     * to that household first.
     */
    protected function switchTo(Request $request, int $householdId): void
    {
        $user = $this->user($request);

        if ($user->current_household_id === $householdId) {
            return;
        }

        $household = $user->households()->whereKey($householdId)->first();

        abort_if($household === null, 403);

        $user->switchHousehold($household);
        $request->attributes->set(EnsureUserHasHousehold::ATTRIBUTE, $household);
        $request->attributes->set('canSeePrices', $household->pricesVisibleTo($user));
    }
}
