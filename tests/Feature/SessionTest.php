<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class SessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_staying_signed_in_sets_the_remember_cookie_on_login(): void
    {
        $user = User::factory()->create();

        $response = $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
            'remember' => '1',
        ]);

        $response->assertCookie(Auth::guard()->getRecallerName());
        $this->assertNotNull($user->refresh()->remember_token);
    }

    public function test_staying_signed_in_sets_the_remember_cookie_on_registration(): void
    {
        $response = $this->post(route('register.store'), [
            'name' => 'Romain',
            'email' => 'romain@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'remember' => '1',
        ]);

        $response->assertCookie(Auth::guard()->getRecallerName());
    }
}
