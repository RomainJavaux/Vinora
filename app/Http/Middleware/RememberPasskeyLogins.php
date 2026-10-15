<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The passkeys JavaScript client does not send the "remember" field: a
 * passkey login is always remembered so the app opens straight away.
 */
class RememberPasskeyLogins
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('post') && $request->routeIs('passkey.login*')) {
            $request->merge(['remember' => true]);
        }

        return $next($request);
    }
}
