<?php

namespace App\Http\Controllers;

use App\Actions\Households\CreateHousehold;
use App\Models\Household;
use App\Models\HouseholdInvitation;
use App\Models\User;
use App\Services\PhotoStore;
use App\Support\Palette;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class HouseholdController extends Controller
{
    public function show(Request $request): Response
    {
        $household = $this->household($request);
        $user = $this->user($request);
        $canManage = $user->can('manageMembers', $household);

        $members = $household->members()
            ->orderBy('household_user.created_at')
            ->get()
            ->map(fn (User $member) => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'role' => $member->pivot?->getAttribute('role'),
                'joinedAt' => $member->pivot?->getAttribute('created_at')?->toIso8601String(),
                'isMe' => $member->id === $user->id,
            ]);

        $invitations = $canManage
            ? $household->invitations()
                ->pending()
                ->with('inviter')
                ->latest()
                ->get()
                ->map(fn (HouseholdInvitation $invitation) => [
                    'id' => $invitation->id,
                    'email' => $invitation->email,
                    'role' => $invitation->role->value,
                    'url' => $invitation->url(),
                    'expiresAt' => $invitation->expires_at->toIso8601String(),
                    'invitedBy' => $invitation->inviter?->name,
                ])
            : [];

        $others = $user->households()
            ->whereKeyNot($household->id)
            ->orderBy('name')
            ->get()
            ->map(fn (Household $other) => [
                'id' => $other->id,
                'name' => $other->name,
                'emoji' => $other->emoji,
                'color' => $other->color,
            ]);

        return Inertia::render('household/show', [
            'members' => $members,
            'invitations' => $invitations,
            'otherHouseholds' => $others,
            'stats' => [
                'cellars' => $household->cellars()->count(),
                'items' => $household->wines()->inStock()->count(),
                'units' => (int) $household->wines()->inStock()->sum('quantity'),
                'createdAt' => $household->created_at?->toIso8601String(),
            ],
            'can' => [
                'update' => $user->can('update', $household),
                'manageMembers' => $canManage,
                'delete' => $user->can('delete', $household),
                'leave' => $user->can('leave', $household),
            ],
        ]);
    }

    public function store(Request $request, CreateHousehold $createHousehold): RedirectResponse
    {
        $validated = $request->validate($this->rules(), [], $this->attributeNames());

        $household = $createHousehold->handle($this->user($request), $validated);

        $this->toast("{$household->name} est créé ! Ajoute ta première cave.");
        $this->celebrate();

        return redirect()->route('dashboard');
    }

    public function update(Request $request): RedirectResponse
    {
        $household = $this->household($request);
        $this->authorize('update', $household);

        $validated = $request->validate([
            ...$this->rules(),
            'share_prices' => ['sometimes', 'boolean'],
        ], [], $this->attributeNames());

        $household->update($validated);

        $this->toast('Lieu mis à jour');

        return back();
    }

    public function switch(Request $request, Household $household): RedirectResponse
    {
        $user = $this->user($request);

        abort_unless($user->belongsToHousehold($household), 403);

        $user->switchHousehold($household);

        $this->toast("Tu es maintenant dans {$household->emoji} {$household->name}");

        return redirect()->route('dashboard');
    }

    public function leave(Request $request): RedirectResponse
    {
        $household = $this->household($request);
        $user = $this->user($request);

        $this->authorize('leave', $household);

        $household->members()->detach($user->id);
        $user->forceFill(['current_household_id' => null])->save();

        $this->toast("Tu as quitté {$household->name}");

        return redirect()->route('dashboard');
    }

    public function destroy(Request $request, PhotoStore $photos): RedirectResponse
    {
        $household = $this->household($request);
        $this->authorize('delete', $household);

        $request->validate([
            'confirmation' => ['required', 'string'],
        ]);

        if (trim((string) $request->input('confirmation')) !== $household->name) {
            throw ValidationException::withMessages([
                'confirmation' => "Tape exactement « {$household->name} » pour confirmer.",
            ]);
        }

        $name = $household->name;
        $photos->deleteHousehold($household->id);
        $household->delete();

        $this->user($request)->forceFill(['current_household_id' => null])->save();

        $this->toast("{$name} a été supprimé", 'info');

        return redirect()->route('dashboard');
    }

    /**
     * @return array<string, array<mixed>>
     */
    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:60'],
            'emoji' => ['nullable', 'string', 'max:16'],
            'color' => ['nullable', Rule::in(Palette::keys())],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function attributeNames(): array
    {
        return [
            'name' => 'nom du lieu',
            'share_prices' => 'visibilité des prix',
        ];
    }
}
