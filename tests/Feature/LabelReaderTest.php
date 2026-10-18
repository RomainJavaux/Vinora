<?php

namespace Tests\Feature;

use Anthropic\Client;
use App\Exceptions\LabelReadingFailed;
use App\Models\User;
use App\Services\LabelReader;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Mockery\MockInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;
use Tests\TestCase;

class LabelReaderTest extends TestCase
{
    use RefreshDatabase;

    private const KEY = 'sk-ant-api03-test-key-0000000000000000000000000000AbCd';

    /**
     * @return array<string, mixed>
     */
    private function fields(): array
    {
        return [
            'name' => 'Château Talbot',
            'producer' => null,
            'vintage' => 2016,
            'appellation' => 'Saint-Julien',
            'region' => 'Bordeaux',
            'country' => 'France',
            'category' => 'red',
            'grapes' => ['Cabernet Sauvignon', 'Merlot'],
            'grapesInferred' => true,
            'alcohol' => 13.5,
            'format' => 'standard',
            'aging' => 'long',
        ];
    }

    public function test_a_user_saves_their_own_key_encrypted(): void
    {
        [$user] = $this->userWithCellar();
        $this->mock(LabelReader::class, fn (MockInterface $mock) => $mock->shouldReceive('verify')->once()->with(self::KEY));

        $this->actingAs($user)
            ->put(route('label-reader.update'), ['key' => '  '.self::KEY.' '])
            ->assertRedirect(route('label-reader.edit'))
            ->assertSessionHasNoErrors();

        $this->assertSame(self::KEY, $user->refresh()->anthropic_api_key);
        $stored = DB::table('users')->where('id', $user->id)->value('anthropic_api_key');
        $this->assertIsString($stored);
        $this->assertStringNotContainsString('sk-ant-', $stored);

        $this->actingAs($user)
            ->get(route('label-reader.edit'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/label-reader')
                ->where('configured', true)
                ->where('hint', '…AbCd')
                ->where('auth.user.canReadLabels', true),
            )
            ->assertDontSee('sk-ant-api03', false);
    }

    public function test_a_key_refused_by_anthropic_is_not_saved(): void
    {
        [$user] = $this->userWithCellar();
        $this->mock(LabelReader::class, fn (MockInterface $mock) => $mock->shouldReceive('verify')->once()->andThrow(LabelReadingFailed::invalidKey()));

        $this->actingAs($user)
            ->put(route('label-reader.update'), ['key' => self::KEY])
            ->assertSessionHasErrors('key');

        $this->assertNull($user->refresh()->anthropic_api_key);
    }

    public function test_something_that_is_not_a_key_is_rejected_before_any_call(): void
    {
        [$user] = $this->userWithCellar();
        $this->mock(LabelReader::class, fn (MockInterface $mock) => $mock->shouldNotReceive('verify'));

        $this->actingAs($user)
            ->put(route('label-reader.update'), ['key' => 'mon-mot-de-passe'])
            ->assertSessionHasErrors('key');
    }

    public function test_the_key_can_be_removed(): void
    {
        [$user] = $this->userWithCellar();
        $user->forceFill(['anthropic_api_key' => self::KEY])->save();

        $this->actingAs($user)
            ->delete(route('label-reader.destroy'))
            ->assertRedirect(route('label-reader.edit'));

        $this->assertFalse($user->refresh()->canReadLabels());
    }

    public function test_a_label_is_read_with_the_key_of_the_user_who_asks(): void
    {
        [$owner, $household] = $this->userWithCellar();
        $owner->forceFill(['anthropic_api_key' => self::KEY])->save();
        $member = $this->joinHousehold($household);
        $member->forceFill(['anthropic_api_key' => 'sk-ant-api03-member-key'])->save();

        $this->mock(LabelReader::class, fn (MockInterface $mock) => $mock->shouldReceive('read')
            ->once()
            ->with('sk-ant-api03-member-key', Mockery::type(UploadedFile::class))
            ->andReturn($this->fields()));

        $this->actingAs($member)
            ->postJson(route('wines.read-label'), ['photo' => UploadedFile::fake()->image('etiquette.jpg', 800, 1000)])
            ->assertOk()
            ->assertJsonPath('fields.name', 'Château Talbot')
            ->assertJsonPath('fields.vintage', 2016);
    }

    public function test_nobody_can_read_labels_with_someone_elses_key(): void
    {
        [$owner, $household] = $this->userWithCellar();
        $owner->forceFill(['anthropic_api_key' => self::KEY])->save();
        $member = $this->joinHousehold($household);
        $stranger = User::factory()->create();
        $this->userWithCellar($stranger);

        $this->mock(LabelReader::class, fn (MockInterface $mock) => $mock->shouldNotReceive('read'));

        foreach ([$member, $stranger->refresh()] as $user) {
            $this->actingAs($user)
                ->postJson(route('wines.read-label'), ['photo' => UploadedFile::fake()->image('etiquette.jpg')])
                ->assertForbidden()
                ->assertJsonPath('errors.photo.0', 'Ajoute d’abord ta clé d’API Anthropic dans Réglages → Lecture d’étiquette.');

            $this->actingAs($user)
                ->get(route('wines.create'))
                ->assertInertia(fn (Assert $page) => $page->where('auth.user.canReadLabels', false));
        }
    }

    public function test_reading_failures_are_explained_under_the_photo(): void
    {
        [$user] = $this->userWithCellar();
        $user->forceFill(['anthropic_api_key' => self::KEY])->save();
        $this->mock(LabelReader::class, fn (MockInterface $mock) => $mock->shouldReceive('read')
            ->andThrow(new LabelReadingFailed('Je ne vois pas d’étiquette de vin sur cette photo.')));

        $this->actingAs($user)
            ->postJson(route('wines.read-label'), ['photo' => UploadedFile::fake()->image('chat.jpg')])
            ->assertStatus(422)
            ->assertJsonPath('errors.photo.0', 'Je ne vois pas d’étiquette de vin sur cette photo.');

        $this->actingAs($user)
            ->postJson(route('wines.read-label'), ['photo' => UploadedFile::fake()->create('notes.pdf', 10)])
            ->assertStatus(422)
            ->assertJsonValidationErrors('photo');
    }

    public function test_readings_are_limited_to_thirty_an_hour(): void
    {
        [$user] = $this->userWithCellar();
        $user->forceFill(['anthropic_api_key' => self::KEY])->save();
        $this->mock(LabelReader::class, fn (MockInterface $mock) => $mock->shouldReceive('read')->times(30)->andReturn($this->fields()));

        for ($i = 0; $i < 30; $i++) {
            $this->actingAs($user)
                ->postJson(route('wines.read-label'), ['photo' => UploadedFile::fake()->image('etiquette.jpg')])
                ->assertOk();
        }

        $this->actingAs($user)
            ->postJson(route('wines.read-label'), ['photo' => UploadedFile::fake()->image('etiquette.jpg')])
            ->assertStatus(429);
    }

    public function test_claudes_answer_is_cleaned_like_the_form(): void
    {
        $fields = LabelReader::fields([
            'is_wine_label' => true,
            'name' => "  Château   Talbot \n",
            'producer' => '',
            'vintage' => 1650,
            'appellation' => str_repeat('A', 200),
            'region' => 'Bordeaux',
            'country' => 'France',
            'category' => 'purple',
            'grapes' => ['Merlot', ' merlot ', '', 'Cabernet Franc'],
            'grapes_inferred' => true,
            'alcohol' => 45,
            'format' => 'liter',
            'aging' => 'very_long',
        ]);

        $this->assertSame('Château Talbot', $fields['name']);
        $this->assertNull($fields['producer']);
        $this->assertNull($fields['vintage']);
        $this->assertSame(120, mb_strlen((string) $fields['appellation']));
        $this->assertNull($fields['category']);
        $this->assertSame(['Merlot', 'Cabernet Franc'], $fields['grapes']);
        $this->assertTrue($fields['grapesInferred']);
        $this->assertNull($fields['alcohol']);
        $this->assertSame('liter', $fields['format']);
        $this->assertSame('very_long', $fields['aging']);
    }

    public function test_a_key_saved_with_another_app_key_just_turns_reading_off(): void
    {
        [$user] = $this->userWithCellar();
        DB::table('users')->where('id', $user->id)->update(['anthropic_api_key' => 'not-decryptable']);

        $this->actingAs($user->refresh())
            ->get(route('wines.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('auth.user.canReadLabels', false));
    }

    public function test_a_key_outside_any_workspace_is_refused_with_an_explanation(): void
    {
        [$user] = $this->userWithCellar();
        $transport = $this->anthropicAnswering(400, [
            'type' => 'error',
            'error' => [
                'type' => 'invalid_request_error',
                'message' => 'This API key is not scoped to a workspace, so this request must include the anthropic-workspace-id header with the ID of the workspace to use. Add the header, or use an API key that is scoped to a workspace.',
            ],
        ]);
        $this->app->instance(LabelReader::class, $this->readerUsing($transport));

        $this->actingAs($user)
            ->put(route('label-reader.update'), ['key' => self::KEY])
            ->assertSessionHasErrors(['key' => 'Cette clé n’est rattachée à aucun espace de travail Anthropic. Sur console.anthropic.com, crée une clé dans un workspace (« Default » convient) puis colle-la dans Réglages → Lecture d’étiquette.']);

        $this->assertNull($user->refresh()->anthropic_api_key);
        $this->assertCount(1, $transport->requests);
        $this->assertSame('/v1/messages', $transport->requests[0]->getUri()->getPath());
        $this->assertSame(self::KEY, $transport->requests[0]->getHeaderLine('x-api-key'));
    }

    public function test_reading_explains_why_anthropic_refused(): void
    {
        $reader = $this->readerUsing($this->anthropicAnswering(400, [
            'type' => 'error',
            'error' => ['type' => 'invalid_request_error', 'message' => 'Your credit balance is too low to access the Anthropic API.'],
        ]));

        try {
            $reader->read(self::KEY, UploadedFile::fake()->image('etiquette.jpg', 600, 800));
            $this->fail('The reading should have failed.');
        } catch (LabelReadingFailed $exception) {
            $this->assertSame(400, $exception->status);
            $this->assertSame('Ton compte Anthropic n’a plus de crédit : ajoutes-en sur console.anthropic.com (Billing), puis réessaie.', $exception->getMessage());
        }
    }

    public function test_a_key_is_accepted_when_anthropic_is_only_overloaded(): void
    {
        $transport = $this->anthropicAnswering(529, ['type' => 'error', 'error' => ['type' => 'overloaded_error', 'message' => 'Overloaded']]);

        $this->readerUsing($transport)->verify(self::KEY);

        $this->assertCount(1, $transport->requests);
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private function anthropicAnswering(int $status, array $body): ClientInterface
    {
        return new class($status, $body) implements ClientInterface
        {
            /** @var list<RequestInterface> */
            public array $requests = [];

            /**
             * @param  array<string, mixed>  $body
             */
            public function __construct(private int $status, private array $body) {}

            public function sendRequest(RequestInterface $request): ResponseInterface
            {
                $this->requests[] = $request;

                return new Response($this->status, ['Content-Type' => 'application/json'], (string) json_encode($this->body));
            }
        };
    }

    private function readerUsing(ClientInterface $transport): LabelReader
    {
        return new class($transport) extends LabelReader
        {
            public function __construct(private ClientInterface $transport) {}

            protected function client(#[\SensitiveParameter] string $apiKey): Client
            {
                return new Client(apiKey: $apiKey, authToken: '', requestOptions: ['transporter' => $this->transport, 'maxRetries' => 0]);
            }
        };
    }

    public function test_the_reader_never_calls_anthropic_without_a_key(): void
    {
        $this->expectException(LabelReadingFailed::class);

        (new LabelReader)->verify('');
    }
}
