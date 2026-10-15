<?php

namespace App\Http\Controllers;

use App\Enums\MovementType;
use App\Http\Resources\MovementResource;
use App\Models\Wine;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Carnet de dégustation": every bottle opened with a rating or a note.
 */
class TastingController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $household = $this->household($request);

        $tastings = $household->movements()
            ->with('user')
            ->where('type', MovementType::Drunk->value)
            ->where(fn ($query) => $query->whereNotNull('rating')->orWhereNotNull('note'))
            ->latest('created_at')
            ->latest('id')
            ->limit(200)
            ->get();

        $drunk = $household->movements()->where('type', MovementType::Drunk->value)->sum('quantity');

        $stock = $household->wines()
            ->whereIn('id', $tastings->pluck('wine_id')->filter()->unique())
            ->get(['id', 'quantity', 'finished_at'])
            ->keyBy('id')
            ->map(fn (Wine $wine) => $wine->finished_at === null ? $wine->quantity : 0);

        return Inertia::render('tastings', [
            'tastings' => MovementResource::collection($tastings)->resolve($request),
            'stock' => $stock,
            'stats' => [
                'count' => $tastings->count(),
                'average' => $tastings->whereNotNull('rating')->avg('rating'),
                'favorites' => $tastings->where('rating', 5)->count(),
                'drunk' => (int) $drunk,
            ],
        ]);
    }
}
