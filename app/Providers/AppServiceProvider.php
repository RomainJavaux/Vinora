<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /** Label readings allowed per user, in a minute and in a day. */
    public const LABELS_PER_MINUTE = 12;

    public const LABELS_PER_DAY = 500;

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        // Each reading costs the user a few cents on their own Anthropic
        // account. Room enough to take stock of a whole cellar in one go,
        // but a stuck button (or a loop) is stopped within the minute, and
        // a day never runs up more than a few euros.
        RateLimiter::for('label-reading', function (Request $request) {
            $user = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());
            $wait = fn (array $headers): int => max(1, (int) ($headers['Retry-After'] ?? 60));

            return [
                Limit::perMinute(self::LABELS_PER_MINUTE)->by("{$user}:minute")
                    ->response(fn (Request $request, array $headers) => response()->json([
                        'message' => 'Doucement : '.self::LABELS_PER_MINUTE.' étiquettes en une minute. Réessaie dans '.$wait($headers).' s.',
                    ], 429, $headers)),
                Limit::perDay(self::LABELS_PER_DAY)->by("{$user}:day")
                    ->response(fn (Request $request, array $headers) => response()->json([
                        'message' => 'Tu as lu '.self::LABELS_PER_DAY.' étiquettes en 24 h : la lecture reprend dans '
                            .max(1, (int) ceil($wait($headers) / 3600)).' h.',
                    ], 429, $headers)),
            ];
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        JsonResource::withoutWrapping();

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        if (app()->isProduction()) {
            URL::forceScheme('https');
        }

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(8)
                ->letters()
                ->uncompromised()
            : null,
        );
    }
}
