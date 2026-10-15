<?php

namespace App\Http\Controllers;

use App\Actions\Cellars\SaveCellar;
use App\Http\Requests\CellarRequest;
use App\Http\Resources\CellarResource;
use App\Models\Cellar;
use App\Models\Wine;
use App\Support\CellarQueries;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CellarController extends Controller
{
    public function index(Request $request): Response
    {
        $household = $this->household($request);

        return Inertia::render('cellars/index', [
            'cellars' => CellarResource::collection(CellarQueries::withStock($household))->resolve($request),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('cellars/form', [
            'cellar' => null,
        ]);
    }

    public function store(CellarRequest $request, SaveCellar $saveCellar): RedirectResponse
    {
        $cellar = $saveCellar->handle($this->household($request), $request->validated());

        $this->toast("{$cellar->name} est prête à être remplie 🍷");
        $this->celebrate();

        return redirect()->route('cellars.show', $cellar);
    }

    public function show(Request $request, Cellar $cellar): Response
    {
        $this->authorize('view', $cellar);
        $this->switchTo($request, $cellar->household_id);

        $household = $this->household($request);
        $loaded = CellarQueries::withStock($household, withCreator: true)->firstWhere('id', $cellar->id);

        $others = $household->cellars()
            ->whereKeyNot($cellar->id)
            ->get(['id', 'name', 'type', 'color'])
            ->map(fn (Cellar $other) => [
                'id' => $other->id,
                'name' => $other->name,
                'type' => $other->type->value,
                'color' => $other->color,
            ]);

        return Inertia::render('cellars/show', [
            'cellar' => (new CellarResource($loaded ?? $cellar))->resolve($request),
            'focus' => [
                'compartment' => $request->integer('compartment') ?: null,
                'item' => $request->integer('item') ?: null,
            ],
            'otherCellars' => $others,
        ]);
    }

    public function edit(Request $request, Cellar $cellar): Response
    {
        $this->authorize('update', $cellar);
        $this->switchTo($request, $cellar->household_id);

        $cellar->load(['compartments' => fn (HasMany $query) => $query->withCount([
            'wines' => fn ($q) => $q->whereNull('finished_at')->where('quantity', '>', 0),
        ])]);

        return Inertia::render('cellars/form', [
            'cellar' => (new CellarResource($cellar))->resolve($request),
        ]);
    }

    public function update(CellarRequest $request, Cellar $cellar, SaveCellar $saveCellar): RedirectResponse
    {
        $this->authorize('update', $cellar);

        $saveCellar->handle($this->household($request), $request->validated(), $cellar);

        $this->toast('Cave mise à jour');

        return redirect()->route('cellars.show', $cellar);
    }

    public function destroy(Request $request, Cellar $cellar): RedirectResponse
    {
        $this->authorize('delete', $cellar);

        $compartments = $cellar->compartments()->pluck('id');
        Wine::query()->whereIn('compartment_id', $compartments)->update(['compartment_id' => null]);

        $name = $cellar->name;
        $cellar->delete();

        $this->toast("{$name} a été supprimée");

        return redirect()->route('cellars.index');
    }
}
