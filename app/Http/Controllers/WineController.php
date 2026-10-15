<?php

namespace App\Http\Controllers;

use App\Enums\MovementType;
use App\Http\Requests\WineRequest;
use App\Http\Resources\MovementResource;
use App\Http\Resources\WineResource;
use App\Models\Cellar;
use App\Models\Household;
use App\Models\Wine;
use App\Services\Inventory;
use App\Support\CellarQueries;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WineController extends Controller
{
    public function index(Request $request): Response
    {
        $household = $this->household($request);

        $items = $household->wines()
            ->inStock()
            ->with(['compartment.cellar', 'creator'])
            ->orderByRaw('drink_until is null, drink_until asc')
            ->orderBy('name')
            ->get();

        $finished = $household->wines()
            ->finished()
            ->with('compartment.cellar')
            ->latest('finished_at')
            ->limit(40)
            ->get();

        return Inertia::render('wines/index', [
            'items' => WineResource::collection($items)->resolve($request),
            'finished' => WineResource::collection($finished)->resolve($request),
            'cellars' => $household->cellars()->get(['id', 'name', 'color', 'type'])->map(fn (Cellar $cellar) => [
                'id' => $cellar->id,
                'name' => $cellar->name,
                'color' => $cellar->color,
                'type' => $cellar->type->value,
            ]),
        ]);
    }

    public function create(Request $request): Response
    {
        $household = $this->household($request);

        $source = null;

        if ($request->filled('from')) {
            $wine = Wine::query()->find($request->integer('from'));

            if ($wine !== null && $wine->household_id === $household->id) {
                $source = (new WineResource($wine->load('compartment.cellar')))->resolve($request);
            }
        }

        $compartmentId = $request->integer('compartment') ?: null;

        if ($compartmentId !== null && ! in_array($compartmentId, $household->compartmentIds(), true)) {
            $compartmentId = null;
        }

        return Inertia::render('wines/form', [
            'wine' => null,
            'source' => $source,
            'defaultCompartmentId' => $compartmentId ?? $source['compartmentId'] ?? null,
            'cellars' => CellarQueries::options($household),
            'suggestions' => $this->suggestions($household, $request),
        ]);
    }

    public function store(WineRequest $request, Inventory $inventory): RedirectResponse
    {
        $household = $this->household($request);

        $source = $request->filled('from')
            ? Wine::query()->where('household_id', $household->id)->find($request->integer('from'))
            : null;

        $wine = $inventory->add(
            $household,
            $this->user($request),
            $request->wineData(),
            $request->file('photo'),
            $source,
        );

        $wine->load('compartment.cellar');

        $this->toast("{$wine->fullName()} rangé dans {$wine->compartment?->name} 🍷");
        $this->celebrate();

        return redirect()->route('cellars.show', [
            'cellar' => $wine->compartment?->cellar_id,
            'compartment' => $wine->compartment_id,
            'item' => $wine->id,
        ]);
    }

    public function show(Request $request, Wine $wine): Response
    {
        $this->authorize('view', $wine);
        $this->switchTo($request, $wine->household_id);

        $household = $this->household($request);
        $wine->load(['compartment.cellar', 'creator']);

        $movements = $wine->movements()
            ->with(['user', 'fromCompartment', 'toCompartment'])
            ->limit(30)
            ->get();

        $siblings = $household->wines()
            ->inStock()
            ->whereKeyNot($wine->id)
            ->where('name', $wine->name)
            ->where(fn ($query) => $wine->producer !== null
                ? $query->where('producer', $wine->producer)
                : $query->whereNull('producer'))
            ->with('compartment.cellar')
            ->orderBy('vintage')
            ->get();

        $tastings = $household->movements()
            ->with('user')
            ->where('type', MovementType::Drunk->value)
            ->where('wine_name', $wine->name)
            ->where(fn ($query) => $query->whereNotNull('rating')->orWhereNotNull('note'))
            ->latest('created_at')
            ->limit(20)
            ->get();

        return Inertia::render('wines/show', [
            'wine' => (new WineResource($wine))->resolve($request),
            'movements' => MovementResource::collection($movements)->resolve($request),
            'siblings' => WineResource::collection($siblings)->resolve($request),
            'tastings' => MovementResource::collection($tastings)->resolve($request),
            'cellars' => CellarQueries::options($household),
        ]);
    }

    public function edit(Request $request, Wine $wine): Response
    {
        $this->authorize('update', $wine);
        $this->switchTo($request, $wine->household_id);

        $household = $this->household($request);

        return Inertia::render('wines/form', [
            'wine' => (new WineResource($wine->load('compartment.cellar')))->resolve($request),
            'source' => null,
            'defaultCompartmentId' => $wine->compartment_id,
            'cellars' => CellarQueries::options($household),
            'suggestions' => $this->suggestions($household, $request),
        ]);
    }

    public function update(WineRequest $request, Wine $wine, Inventory $inventory): RedirectResponse
    {
        $this->authorize('update', $wine);

        $data = $request->wineData();

        if (! (bool) $request->attributes->get('canSeePrices', true)) {
            unset($data['price_cents'], $data['value_cents']);
        }

        $inventory->update(
            $wine,
            $this->user($request),
            $data,
            $request->file('photo'),
            $request->boolean('remove_photo'),
        );

        $this->toast('Modifications enregistrées');

        return redirect()->route('wines.show', $wine);
    }

    public function destroy(Request $request, Wine $wine, Inventory $inventory): RedirectResponse
    {
        $this->authorize('delete', $wine);

        $name = $wine->fullName();
        $inventory->delete($wine);

        $this->toast("{$name} a été retiré de la cave");

        return redirect()->route('wines.index');
    }

    /**
     * "Déjà dans ta cave": the wines already stored in this household, to
     * fill the form in one tap (same cuvée, another vintage…).
     *
     * @return list<array<string, mixed>>
     */
    private function suggestions(Household $household, Request $request): array
    {
        $canSeePrices = (bool) $request->attributes->get('canSeePrices', true);

        return array_values($household->wines()
            ->latest('id')
            ->limit(200)
            ->get()
            ->unique(fn (Wine $wine) => mb_strtolower(trim($wine->name).'|'.trim((string) $wine->producer)))
            ->take(40)
            ->map(fn (Wine $wine) => [
                'id' => $wine->id,
                'name' => $wine->name,
                'producer' => $wine->producer,
                'category' => $wine->category->value,
                'vintage' => $wine->vintage,
                'appellation' => $wine->appellation,
                'region' => $wine->region,
                'country' => $wine->country,
                'grapes' => $wine->grapes ?? [],
                'format' => $wine->format->value,
                'aging' => $wine->aging?->value,
                'alcohol' => $wine->alcohol,
                'priceCents' => $canSeePrices ? $wine->price_cents : null,
                'boughtFrom' => $wine->bought_from,
            ])
            ->all());
    }
}
