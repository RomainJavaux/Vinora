<?php

namespace App\Support;

use App\Enums\AgingPotential;
use App\Enums\WineCategory;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * The wine's "life cycle": the window of years during which it should be
 * opened. It replaces the best-before date of a food-oriented inventory.
 *
 * Statuses:
 *  - young   : too early, better wait (blue)
 *  - ready   : inside the window (green)
 *  - soon    : last year of the window, drink it now (amber)
 *  - past    : the window is over (red)
 *  - unknown : no window
 */
final class DrinkWindow
{
    public const YOUNG = 'young';

    public const READY = 'ready';

    public const SOON = 'soon';

    public const PAST = 'past';

    public const UNKNOWN = 'unknown';

    /**
     * Suggest a drinking window from the colour, the ageing potential and
     * the vintage. Non-vintage wines count from the given base year.
     *
     * @return array{0: int, 1: int}|null
     */
    public static function suggest(WineCategory $category, ?AgingPotential $aging, ?int $vintage, ?int $baseYear = null): ?array
    {
        $aging ??= $category->defaultAging();

        if ($aging === null) {
            return null;
        }

        $base = $vintage ?? $baseYear ?? CarbonImmutable::now()->year;

        return [$base + $aging->startOffset(), $base + $aging->endOffset()];
    }

    public static function status(?int $from, ?int $until, ?CarbonInterface $today = null): string
    {
        if ($from === null && $until === null) {
            return self::UNKNOWN;
        }

        $year = ($today ?? CarbonImmutable::now())->year;

        return match (true) {
            $from !== null && $year < $from => self::YOUNG,
            $until !== null && $year > $until => self::PAST,
            $until !== null && $year === $until => self::SOON,
            default => self::READY,
        };
    }

    /**
     * Everything the interface needs to display the window.
     *
     * @return array{status: string, from: int|null, until: int|null, daysLeft: int|null, daysUntilReady: int|null, progress: float|null}
     */
    public static function describe(?int $from, ?int $until, ?int $vintage = null, ?CarbonInterface $since = null, ?CarbonInterface $today = null): array
    {
        $today = CarbonImmutable::instance($today ?? CarbonImmutable::now())->startOfDay();
        $status = self::status($from, $until, $today);

        $end = $until !== null ? CarbonImmutable::create($until, 12, 31)->startOfDay() : null;
        $ready = $from !== null ? CarbonImmutable::create($from, 1, 1)->startOfDay() : null;

        $daysLeft = $end !== null ? (int) $today->diffInDays($end, false) : null;
        $daysUntilReady = $ready !== null && $ready->greaterThan($today) ? (int) $today->diffInDays($ready, false) : null;

        $origin = match (true) {
            $vintage !== null => CarbonImmutable::create($vintage, 1, 1)->startOfDay(),
            $since !== null => CarbonImmutable::instance($since)->startOfDay(),
            default => null,
        };

        $progress = match ($status) {
            self::UNKNOWN => null,
            self::YOUNG => self::ratio($origin, $ready, $today),
            default => $end === null ? 0.0 : self::ratio($ready ?? $origin, $end->addDay(), $today),
        };

        return [
            'status' => $status,
            'from' => $from,
            'until' => $until,
            'daysLeft' => $daysLeft,
            'daysUntilReady' => $daysUntilReady,
            'progress' => $progress,
        ];
    }

    private static function ratio(?CarbonInterface $start, ?CarbonInterface $end, CarbonInterface $today): float
    {
        if ($start === null || $end === null || ! $end->greaterThan($start)) {
            return $end !== null && $today->greaterThanOrEqualTo($end) ? 1.0 : 0.0;
        }

        $total = $start->diffInSeconds($end);
        $elapsed = $start->diffInSeconds($today, false);

        return round(max(0, min(1, $elapsed / $total)), 3);
    }
}
