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
use App\Support\KnownValues;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;
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
            'known' => KnownValues::for($household),
            'stock' => $this->stock($household),
        ]);
    }

    public function store(WineRequest $request, Inventory $inventory): RedirectResponse
    {
        $household = $this->household($request);

        $source = $request->filled('from')
            ? Wine::query()->where('household_id', $household->id)->find($request->integer('from'))
            : null;

        $user = $this->user($request);
        $data = $request->wineData();

        // The same wine is already in stock: the bottles join that lot.
        if ($request->filled('merge_into')) {
            return $this->mergeInto($request, $inventory, $household, $data);
        }

        // Some bottles may go elsewhere when there is not enough room: one
        // lot per place, bottles for the main place first.
        $placements = collect($request->placements())
            ->groupBy('compartment_id')
            ->map(fn ($rows) => (int) $rows->sum('quantity'));
        $mainCompartment = (int) $data['compartment_id'];
        $elsewhere = $placements->except([$mainCompartment]);
        $data['quantity'] = (int) $data['quantity'] - (int) $elsewhere->sum();

        $wine = $inventory->add($household, $user, $data, $request->file('photo'), $source);
        $places = [$wine->load('compartment')->compartment?->name];

        foreach ($elsewhere as $compartmentId => $quantity) {
            $lot = $inventory->add($household, $user, [...$data, 'compartment_id' => $compartmentId, 'quantity' => $quantity], null, $wine);
            $places[] = $lot->load('compartment')->compartment?->name;
        }

        $wine->load('compartment.cellar');

        $where = count($places) > 1
            ? implode(', ', array_slice($places, 0, -1)).' et '.end($places)
            : $places[0];

        $this->toast("{$wine->fullName()} rangé dans {$where} 🍷");
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

    /**
     * Printable label sized for a label printer (90 × 38 mm detailed, or
     * 29 × 29 mm QR code).
     */
    public function label(Request $request, Wine $wine): Response
    {
        $this->authorize('view', $wine);
        $this->switchTo($request, $wine->household_id);

        return Inertia::render('wines/label', [
            'wine' => (new WineResource($wine->load('compartment.cellar')))->resolve($request),
            'format' => $request->query('format') === 'square' ? 'square' : 'detailed',
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
            'known' => KnownValues::for($household),
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
     * New bottles of a wine already in stock (same cuvée, estate, vintage,
     * format and colour) join that lot instead of starting a new one.
     *
     * @param  array<string, mixed>  $data
     */
    private function mergeInto(WineRequest $request, Inventory $inventory, Household $household, array $data): RedirectResponse
    {
        $lot = $household->wines()->inStock()->find($request->integer('merge_into'));
        $bottles = new Wine(Arr::only($data, ['name', 'producer', 'vintage', 'format', 'category', 'keepsake']));

        // Same wine, and the same « Ne pas boire » choice: a gift never
        // joins bottles meant to be drunk, nor the other way round.
        if ($lot === null || $lot->identityKey() !== $bottles->identityKey() || $lot->keepsake !== (bool) $bottles->keepsake) {
            throw ValidationException::withMessages([
                'merge_into' => 'Ces bouteilles ne correspondent plus au vin en cave : range-les normalement.',
            ]);
        }

        $user = $this->user($request);
        $total = (int) $data['quantity'];
        // The lot's place, or the one chosen when the lot has lost its own.
        $target = $lot->compartment_id ?? (int) $data['compartment_id'];

        // A split chosen in the form is kept: the bottles meant for other
        // places join the same wine there, or start a lot of their own.
        $elsewhere = collect($request->placements())
            ->groupBy('compartment_id')
            ->map(fn ($rows) => (int) $rows->sum('quantity'))
            ->except([$target]);
        $here = $total - (int) $elsewhere->sum();

        $lot = $inventory->join($lot, $user, $here, $data, $request->file('photo'), $target);

        foreach ($elsewhere as $compartmentId => $quantity) {
            $twin = $inventory->twinIn($lot, (int) $compartmentId);

            $twin !== null
                ? $inventory->join($twin, $user, $quantity, $data, $lot)
                : $inventory->add($household, $user, [...$data, 'compartment_id' => $compartmentId, 'quantity' => $quantity], null, $lot);
        }

        $lot->load('compartment.cellar');

        $this->toast("{$lot->fullName()} : +{$here}, soit ".$lot->format->format($lot->quantity)." dans {$lot->compartment?->name}"
            .($elsewhere->isNotEmpty() ? ' (et '.$elsewhere->sum().' ailleurs)' : '').' 🍷');
        $this->celebrate();

        return $lot->compartment !== null
            ? redirect()->route('cellars.show', [
                'cellar' => $lot->compartment->cellar_id,
                'compartment' => $lot->compartment_id,
                'item' => $lot->id,
            ])
            : redirect()->route('wines.show', $lot);
    }

    /**
     * The lots in stock, to warn when the wine being added is already there.
     *
     * @return list<array<string, mixed>>
     */
    private function stock(Household $household): array
    {
        return array_values($household->wines()
            ->inStock()
            ->with('compartment.cellar')
            ->get()
            ->map(fn (Wine $wine) => [
                'id' => $wine->id,
                'name' => $wine->name,
                'producer' => $wine->producer,
                'vintage' => $wine->vintage,
                'format' => $wine->format->value,
                'category' => $wine->category->value,
                'keepsake' => $wine->keepsake,
                'quantity' => $wine->quantity,
                'compartmentId' => $wine->compartment_id,
                'place' => $wine->compartment !== null
                    ? "{$wine->compartment->cellar->name} › {$wine->compartment->name}"
                    : null,
            ])
            ->all());
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
