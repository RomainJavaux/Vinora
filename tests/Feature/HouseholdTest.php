<?php

namespace Tests\Feature;

use App\Enums\HouseholdRole;
use App\Models\Household;
use App\Models\HouseholdInvitation;
use App\Models\User;
use App\Notifications\HouseholdInvitationNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HouseholdTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_invitation_can_be_sent_by_email(): void
    {
        Notification::fake();
        [$user, $household] = $this->userWithCellar();

        $this->actingAs($user)
            ->post(route('invitations.store'), ['email' => 'camille@example.com', 'role' => 'admin'])
            ->assertRedirect()
            ->assertInertiaFlash('invitation.emailed', true);

        $invitation = $household->invitations()->sole();
        $this->assertSame(HouseholdRole::Admin, $invitation->role);
        $this->assertSame(40, strlen($invitation->token));
        $this->assertTrue($invitation->expires_at->isAfter(now()->addDays(6)));

        Notification::assertSentTo(new AnonymousNotifiable, HouseholdInvitationNotification::class);
    }

    public function test_members_cannot_invite(): void
    {
        [, $household] = $this->userWithCellar();
        $member = $this->joinHousehold($household);

        $this->actingAs($member)->post(route('invitations.store'), ['role' => 'member'])->assertForbidden();
    }

    public function test_a_guest_registers_and_comes_back_to_the_invitation(): void
    {
        [, $household] = $this->userWithCellar();
        $invitation = $this->invitation($household);

        $this->get(route('invitations.show', $invitation->token))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('invitations/show')
                ->where('invitation.status', 'pending')
                ->where('invitation.household.name', 'La maison'));

        $this->post(route('register.store'), [
            'name' => 'Camille',
            'email' => 'camille@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'remember' => '1',
        ])->assertRedirect(route('invitations.show', $invitation->token));

        $this->get(route('dashboard'))->assertRedirect(route('invitations.show', $invitation->token));
    }

    public function test_accepting_an_invitation_joins_the_household(): void
    {
        [, $household] = $this->userWithCellar();
        $invitation = $this->invitation($household, HouseholdRole::Admin);
        $guest = User::factory()->create();

        $this->actingAs($guest)
            ->post(route('invitations.accept', $invitation->token))
            ->assertRedirect(route('dashboard'))
            ->assertInertiaFlash('celebrate', true);

        $this->assertSame(HouseholdRole::Admin, $household->roleOf($guest));
        $this->assertSame($household->id, $guest->refresh()->current_household_id);
        $this->assertNotNull($invitation->refresh()->accepted_at);
    }

    public function test_an_expired_invitation_is_refused(): void
    {
        [, $household] = $this->userWithCellar();
        $invitation = $this->invitation($household);
        $invitation->update(['expires_at' => now()->subDay()]);

        $this->actingAs(User::factory()->create())
            ->post(route('invitations.accept', $invitation->token))
            ->assertStatus(410);
    }

    public function test_users_can_switch_between_their_households_only(): void
    {
        [$user] = $this->userWithCellar();
        [, $other] = $this->userWithCellar();

        $this->actingAs($user)->put(route('households.switch', $other))->assertForbidden();

        $this->joinHousehold($other, user: $user);
        $this->actingAs($user)->put(route('households.switch', $other))->assertRedirect(route('dashboard'));
        $this->assertSame($other->id, $user->refresh()->current_household_id);
    }

    public function test_an_admin_can_remove_a_member_but_not_the_owner(): void
    {
        [$owner, $household] = $this->userWithCellar();
        $admin = $this->joinHousehold($household, HouseholdRole::Admin);
        $member = $this->joinHousehold($household);

        $this->actingAs($admin)->delete(route('members.destroy', $owner))->assertForbidden();
        $this->actingAs($admin)->patch(route('members.update', $member), ['role' => 'admin'])->assertRedirect();
        $this->assertSame(HouseholdRole::Admin, $household->roleOf($member));

        $this->actingAs($admin)->delete(route('members.destroy', $member))->assertRedirect();
        $this->assertNull($household->roleOf($member));
    }

    public function test_members_can_leave_but_not_the_owner(): void
    {
        [$owner, $household] = $this->userWithCellar();
        $member = $this->joinHousehold($household);

        $this->actingAs($owner)->post(route('household.leave'))->assertForbidden();
        $this->actingAs($member)->post(route('household.leave'))->assertRedirect(route('dashboard'));

        $this->assertNull($household->roleOf($member));
        $this->assertNull($member->refresh()->current_household_id);
    }

    public function test_deleting_a_household_requires_its_exact_name(): void
    {
        [$owner, $household] = $this->userWithCellar();

        $this->actingAs($owner)->delete(route('household.destroy'), ['confirmation' => 'la maison'])->assertSessionHasErrors('confirmation');
        $this->assertNotNull($household->fresh());

        $this->actingAs($owner)->delete(route('household.destroy'), ['confirmation' => 'La maison'])->assertRedirect(route('dashboard'));
        $this->assertNull(Household::query()->find($household->id));
    }

    public function test_the_owner_can_hide_prices_from_members(): void
    {
        [$owner, $household] = $this->userWithCellar();
        $member = $this->joinHousehold($household);

        $this->actingAs($member)->patch(route('household.update'), ['name' => 'Chez nous', 'share_prices' => false])->assertForbidden();

        $this->actingAs($owner)->patch(route('household.update'), ['name' => 'Chez nous', 'share_prices' => false])->assertRedirect();
        $this->assertFalse($household->refresh()->share_prices);
        $this->assertFalse($household->pricesVisibleTo($member));
        $this->assertTrue($household->pricesVisibleTo($owner));
    }

    private function invitation(Household $household, HouseholdRole $role = HouseholdRole::Member): HouseholdInvitation
    {
        return $household->invitations()->create([
            'invited_by' => $household->owner_id,
            'token' => Str::random(40),
            'role' => $role,
            'expires_at' => now()->addDays(7),
        ]);
    }
}
