<?php

namespace App\Http\Controllers;

use App\Enums\MovementType;
use App\Http\Resources\CellarResource;
use App\Http\Resources\MovementResource;
use App\Http\Resources\WineResource;
use App\Models\Wine;
use App\Support\CellarQueries;
use App\Support\DrinkWindow;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $household = $this->household($request);
        $user = $this->user($request);
        $year = now()->year;
        $canSeePrices = (bool) $request->attributes->get('canSeePrices', true);

        $stock = $household->wines()->inStock()->with('compartment.cellar')->get();
        $monthStart = now()->startOfMonth();

        $monthly = $household->movements()
            ->where('created_at', '>=', $monthStart)
            ->whereIn('type', [MovementType::Added->value, MovementType::Drunk->value, MovementType::Gifted->value])
            ->selectRaw('type, SUM(quantity) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $value = $canSeePrices
            ? (int) $stock->sum(fn (Wine $wine) => ($wine->unitValueCents() ?? 0) * $wine->quantity)
            : null;

        $cellars = CellarQueries::withStock($household);

        $stats = [
            'items' => $stock->count(),
            'units' => (int) $stock->sum('quantity'),
            'urgent' => (int) $stock->filter(fn (Wine $wine) => $wine->isUrgent())->sum('quantity'),
            'ready' => (int) $stock->filter(fn (Wine $wine) => $wine->windowStatus() === DrinkWindow::READY)->sum('quantity'),
            'young' => (int) $stock->filter(fn (Wine $wine) => $wine->windowStatus() === DrinkWindow::YOUNG)->sum('quantity'),
            'members' => $household->members()->count(),
            'addedThisMonth' => (int) ($monthly[MovementType::Added->value] ?? 0),
            'drunkThisMonth' => (int) ($monthly[MovementType::Drunk->value] ?? 0) + (int) ($monthly[MovementType::Gifted->value] ?? 0),
            'valueCents' => $value,
            'liters' => round($stock->sum(fn (Wine $wine) => $wine->format->milliliters() * $wine->quantity) / 1000, 1),
            'capacity' => (int) $cellars->sum(fn ($cellar) => $cellar->compartments->sum('capacity') * max(1, $cellar->depth)),
        ];

        $priority = $stock
            ->filter(fn (Wine $wine) => $wine->drink_until !== null && $wine->canBeSuggested())
            ->sortBy([
                fn (Wine $a, Wine $b) => $a->drink_until <=> $b->drink_until,
                fn (Wine $a, Wine $b) => ($a->vintage ?? PHP_INT_MAX) <=> ($b->vintage ?? PHP_INT_MAX),
            ])
            ->take(10)
            ->values();

        $suggestions = $stock
            ->filter(fn (Wine $wine) => $wine->canBeSuggested())
            ->sortBy(fn (Wine $wine) => $wine->drink_until ?? $year + 100)
            ->take(40)
            ->values();

        $categories = $stock
            ->groupBy(fn (Wine $wine) => $wine->category->value)
            ->map(fn ($wines, string $category) => [
                'category' => $category,
                'units' => (int) $wines->sum('quantity'),
                'items' => $wines->count(),
            ])
            ->sortByDesc('units')
            ->values();

        $regions = $stock
            ->filter(fn (Wine $wine) => filled($wine->region))
            ->groupBy(fn (Wine $wine) => (string) $wine->region)
            ->map(fn ($wines, string $region) => ['region' => $region, 'units' => (int) $wines->sum('quantity')])
            ->sortByDesc('units')
            ->take(6)
            ->values();

        $vintages = $stock
            ->filter(fn (Wine $wine) => $wine->vintage !== null)
            ->groupBy(fn (Wine $wine) => (int) $wine->vintage)
            ->map(fn ($wines, int $vintage) => ['vintage' => $vintage, 'units' => (int) $wines->sum('quantity')])
            ->sortBy('vintage')
            ->values();

        $activity = $household->movements()
            ->with(['user', 'fromCompartment', 'toCompartment'])
            ->latest('created_at')
            ->latest('id')
            ->limit(8)
            ->get();

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'priority' => WineResource::collection($priority)->resolve($request),
            'suggestions' => WineResource::collection($suggestions)->resolve($request),
            'cellars' => CellarResource::collection($cellars)->resolve($request),
            'categories' => $categories,
            'regions' => $regions,
            'vintages' => $vintages,
            'activity' => MovementResource::collection($activity)->resolve($request),
            'hasPasskey' => $user->passkeys()->exists(),
        ]);
    }
}
