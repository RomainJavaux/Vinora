<?php

namespace App\Http\Controllers;

use App\Actions\Cellars\SaveCellar;
use App\Actions\Households\CreateHousehold;
use App\Http\Requests\CellarRequest;
use App\Support\Palette;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $isAdditional = $request->boolean('new');

        if (! $isAdditional && $this->user($request)->households()->exists()) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('onboarding', [
            'isAdditional' => $isAdditional,
        ]);
    }

    public function store(Request $request, CreateHousehold $createHousehold, SaveCellar $saveCellar): RedirectResponse
    {
        $hasCellar = is_array($request->input('cellar')) && filled($request->input('cellar.name'));

        $validated = $request->validate([
            'household.name' => ['required', 'string', 'max:60'],
            'household.emoji' => ['nullable', 'string', 'max:16'],
            'household.color' => ['nullable', Rule::in(Palette::keys())],
            ...($hasCellar ? CellarRequest::rulesFor('cellar.', $request->input('cellar.type')) : []),
        ], [], [
            'household.name' => 'nom du lieu',
            'household.emoji' => 'emoji',
            'household.color' => 'couleur',
            'cellar.name' => 'nom de la cave',
            'cellar.type' => 'type de cave',
            'cellar.compartments' => 'compartiments',
            'cellar.compartments.*.name' => 'nom du compartiment',
        ]);

        /** @var array{name: string, emoji?: string|null, color?: string|null} $householdData */
        $householdData = $validated['household'];
        $household = $createHousehold->handle($this->user($request), $householdData);

        if ($hasCellar) {
            /** @var array<string, mixed> $cellarData */
            $cellarData = Arr::get($validated, 'cellar', []);
            $saveCellar->handle($household, $cellarData);
            $this->toast("Bienvenue chez {$household->name} ! 🍷");
        } else {
            $this->toast("{$household->name} est créé ! Ajoute ta première cave.");
        }

        $this->celebrate();

        return redirect()->route('dashboard');
    }
}
