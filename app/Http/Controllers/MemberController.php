<?php

namespace App\Http\Controllers;

use App\Enums\HouseholdRole;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MemberController extends Controller
{
    public function update(Request $request, User $member): RedirectResponse
    {
        $household = $this->household($request);
        $this->authorize('manageMembers', $household);

        $validated = $request->validate([
            'role' => ['required', Rule::in(array_map(fn (HouseholdRole $role) => $role->value, HouseholdRole::assignable()))],
        ]);

        $current = $household->roleOf($member);

        abort_if($current === null, 404);
        abort_if($current === HouseholdRole::Owner, 403, 'Le propriétaire ne peut pas changer de rôle.');

        $household->members()->updateExistingPivot($member->id, ['role' => $validated['role']]);

        $this->toast("{$member->name} est maintenant ".HouseholdRole::from($validated['role'])->label());

        return back();
    }

    public function destroy(Request $request, User $member): RedirectResponse
    {
        $household = $this->household($request);
        $this->authorize('manageMembers', $household);

        $current = $household->roleOf($member);

        abort_if($current === null, 404);
        abort_if($current === HouseholdRole::Owner, 403, 'Le propriétaire ne peut pas être retiré.');
        abort_if($member->id === $this->user($request)->id, 403, 'Pour partir, quitte le lieu.');

        $household->members()->detach($member->id);

        if ($member->current_household_id === $household->id) {
            $member->forceFill(['current_household_id' => null])->save();
        }

        $this->toast("{$member->name} ne fait plus partie de {$household->name}");

        return back();
    }
}
