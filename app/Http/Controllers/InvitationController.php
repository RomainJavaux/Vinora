<?php

namespace App\Http\Controllers;

use App\Enums\HouseholdRole;
use App\Models\HouseholdInvitation;
use App\Models\User;
use App\Notifications\HouseholdInvitationNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class InvitationController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $household = $this->household($request);
        $this->authorize('manageMembers', $household);

        $validated = $request->validate([
            'email' => ['nullable', 'email', 'max:255'],
            'role' => ['required', Rule::in(array_map(fn (HouseholdRole $role) => $role->value, HouseholdRole::assignable()))],
        ], [], ['email' => 'e-mail', 'role' => 'rôle']);

        $invitation = $household->invitations()->create([
            'invited_by' => $this->user($request)->id,
            'email' => $validated['email'] ?? null,
            'token' => Str::random(40),
            'role' => $validated['role'],
            'expires_at' => now()->addDays(HouseholdInvitation::VALID_DAYS),
        ]);

        $emailed = false;

        if ($invitation->email !== null) {
            try {
                Notification::route('mail', $invitation->email)->notifyNow(new HouseholdInvitationNotification($invitation));
                $emailed = true;
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        Inertia::flash('invitation', [
            'id' => $invitation->id,
            'url' => $invitation->url(),
            'email' => $invitation->email,
            'emailed' => $emailed,
        ]);

        return back();
    }

    public function destroy(Request $request, HouseholdInvitation $invitation): RedirectResponse
    {
        $household = $this->household($request);
        $this->authorize('manageMembers', $household);

        abort_unless($invitation->household_id === $household->id, 404);

        $invitation->delete();

        $this->toast('Invitation annulée', 'info');

        return back();
    }

    public function show(Request $request, string $token): Response
    {
        $invitation = HouseholdInvitation::query()->with(['household.members', 'inviter'])->where('token', $token)->first();

        /** @var User|null $user */
        $user = $request->user();

        if ($invitation !== null && $invitation->status() === 'pending' && $user === null) {
            $request->session()->put('invitation_token', $token);
            $request->session()->put('url.intended', $invitation->url());
        }

        $household = $invitation?->household;

        return Inertia::render('invitations/show', [
            'token' => $token,
            'invitation' => $invitation !== null && $household !== null ? [
                'status' => $invitation->status(),
                'email' => $invitation->email,
                'role' => $invitation->role->value,
                'invitedBy' => $invitation->inviter?->name,
                'household' => [
                    'name' => $household->name,
                    'emoji' => $household->emoji,
                    'color' => $household->color,
                    'members' => $household->members->map(fn (User $member) => ['id' => $member->id, 'name' => $member->name])->values(),
                    'cellars' => $household->cellars()->count(),
                ],
                'alreadyMember' => $user !== null && $user->belongsToHousehold($household),
            ] : null,
        ]);
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        $user = $this->user($request);
        $invitation = HouseholdInvitation::query()->with('household')->where('token', $token)->firstOrFail();
        $household = $invitation->household;

        if ($user->belongsToHousehold($household)) {
            $request->session()->forget('invitation_token');
            $user->switchHousehold($household);

            return redirect()->route('dashboard');
        }

        abort_if($invitation->status() !== 'pending', 410, 'Cette invitation n’est plus valable.');

        DB::transaction(function () use ($invitation, $household, $user) {
            $household->members()->attach($user->id, ['role' => $invitation->role->value]);
            $invitation->forceFill(['accepted_at' => now(), 'accepted_by' => $user->id])->save();
            $user->switchHousehold($household);
        });

        $request->session()->forget('invitation_token');

        $this->toast("Bienvenue dans {$household->emoji} {$household->name} !");
        $this->celebrate();

        return redirect()->route('dashboard');
    }
}
