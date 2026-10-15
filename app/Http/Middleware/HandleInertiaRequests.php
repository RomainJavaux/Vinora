<?php

namespace App\Http\Middleware;

use App\Models\Household;
use App\Models\User;
use App\Support\Catalog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user !== null ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified_at' => $user->email_verified_at?->toIso8601String(),
                    'created_at' => $user->created_at?->toIso8601String(),
                    'updated_at' => $user->updated_at?->toIso8601String(),
                ] : null,
            ],
            // Evaluated after the controllers, which may switch the household.
            'household' => fn () => $this->household($request, $user),
            'households' => fn () => $user?->households()
                ->orderBy('name')
                ->get()
                ->map(fn (Household $household) => [
                    'id' => $household->id,
                    'name' => $household->name,
                    'emoji' => $household->emoji,
                    'color' => $household->color,
                ])
                ->values()
                ->all() ?? [],
            'catalog' => Inertia::once(fn () => Catalog::toArray()),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function household(Request $request, ?User $user): ?array
    {
        if ($user === null) {
            return null;
        }

        $household = $request->attributes->get(EnsureUserHasHousehold::ATTRIBUTE);

        if (! $household instanceof Household) {
            $household = $user->current_household_id !== null
                ? $user->households()->whereKey($user->current_household_id)->first()
                : null;
        }

        if ($household === null) {
            return null;
        }

        $role = $household->roleOf($user);

        return [
            'id' => $household->id,
            'name' => $household->name,
            'emoji' => $household->emoji,
            'color' => $household->color,
            'sharePrices' => $household->share_prices,
            'role' => $role?->value,
            'canSeePrices' => $household->share_prices || ($role?->canManage() ?? false),
        ];
    }
}
