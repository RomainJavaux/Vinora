<?php

namespace App\Http\Controllers;

use App\Enums\DiscardReason;
use App\Models\Wine;
use App\Rules\CompartmentInHousehold;
use App\Services\Inventory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WineStockController extends Controller
{
    public function drink(Request $request, Wine $wine, Inventory $inventory): RedirectResponse
    {
        $this->authorize('update', $wine);

        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:'.max(1, $wine->quantity)],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'note' => ['nullable', 'string', 'max:1000'],
        ], [], ['quantity' => 'nombre de bouteilles', 'rating' => 'note', 'note' => 'commentaire']);

        $wine = $inventory->drink($wine, $this->user($request), (int) $validated['quantity'], $validated['rating'] ?? null, $validated['note'] ?? null);

        $this->toast($wine->quantity > 0
            ? 'Santé ! Il reste '.$wine->format->format($wine->quantity)." de {$wine->fullName()}"
            : "Santé ! Il n’y a plus de {$wine->fullName()} en cave 🥂");

        return back();
    }

    public function gift(Request $request, Wine $wine, Inventory $inventory): RedirectResponse
    {
        $this->authorize('update', $wine);

        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:'.max(1, $wine->quantity)],
            'recipient' => ['nullable', 'string', 'max:120'],
        ], [], ['quantity' => 'nombre de bouteilles', 'recipient' => 'destinataire']);

        $wine = $inventory->gift($wine, $this->user($request), (int) $validated['quantity'], $validated['recipient'] ?? null);

        $recipient = filled($validated['recipient'] ?? null) ? " à {$validated['recipient']}" : '';
        $this->toast("Joli cadeau{$recipient} ! 🎁");

        return back();
    }

    public function restock(Request $request, Wine $wine, Inventory $inventory): RedirectResponse
    {
        $this->authorize('update', $wine);

        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'between:1,999'],
            'compartment_id' => ['nullable', 'integer', new CompartmentInHousehold($this->household($request))],
        ], [], ['quantity' => 'nombre de bouteilles', 'compartment_id' => 'emplacement']);

        $wine = $inventory->restock($wine, $this->user($request), (int) $validated['quantity'], $validated['compartment_id'] ?? null);

        $this->toast("{$wine->fullName()} : ".$wine->format->format($wine->quantity).' en cave');
        $this->celebrate();

        return back();
    }

    public function move(Request $request, Wine $wine, Inventory $inventory): RedirectResponse
    {
        $this->authorize('update', $wine);

        $validated = $request->validate([
            'compartment_id' => ['required', 'integer', new CompartmentInHousehold($this->household($request))],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:'.max(1, $wine->quantity)],
        ], [], ['compartment_id' => 'emplacement', 'quantity' => 'nombre de bouteilles']);

        $quantity = isset($validated['quantity']) ? (int) $validated['quantity'] : null;
        $target = $inventory->move($wine, $this->user($request), (int) $validated['compartment_id'], $quantity);
        $target->load('compartment');

        $moved = $quantity !== null && $quantity < $wine->quantity ? $wine->format->format($quantity).' de ' : '';
        $this->toast("{$moved}{$wine->fullName()} déplacé dans {$target->compartment?->name}");

        if ($target->id !== $wine->id && $request->boolean('follow')) {
            return redirect()->route('wines.show', $target);
        }

        return back();
    }

    public function discard(Request $request, Wine $wine, Inventory $inventory): RedirectResponse
    {
        $this->authorize('update', $wine);

        $validated = $request->validate([
            'reason' => ['required', Rule::enum(DiscardReason::class)],
            'note' => ['nullable', 'string', 'max:200'],
        ], [], ['reason' => 'motif', 'note' => 'précision']);

        $inventory->discard($wine, $this->user($request), DiscardReason::from($validated['reason']), $validated['note'] ?? null);

        $this->toast("{$wine->fullName()} est sorti de la cave", 'info');

        return back();
    }
}
