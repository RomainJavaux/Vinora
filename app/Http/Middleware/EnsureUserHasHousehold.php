<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolve the household the user works in. Without one, the user goes to
 * the pending invitation (if any) or to the onboarding.
 */
class EnsureUserHasHousehold
{
    public const ATTRIBUTE = 'household';

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user === null) {
            return redirect()->guest(route('login'));
        }

        $household = $user->resolveCurrentHousehold();

        if ($household === null) {
            $token = $request->session()->get('invitation_token');

            return is_string($token)
                ? redirect()->route('invitations.show', $token)
                : redirect()->route('onboarding');
        }

        $request->attributes->set(self::ATTRIBUTE, $household);
        $request->attributes->set('canSeePrices', $household->pricesVisibleTo($user));

        return $next($request);
    }
}
