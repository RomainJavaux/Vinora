<?php

namespace App\Notifications;

use App\Models\HouseholdInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class HouseholdInvitationNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly HouseholdInvitation $invitation) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $household = $this->invitation->household;
        $inviter = $this->invitation->inviter->name ?? 'Quelqu’un';

        return (new MailMessage)
            ->subject("{$inviter} t’invite dans {$household->name} sur Vinora")
            ->greeting('Coucou ! 👋')
            ->line("{$inviter} t’invite à partager les caves de **{$household->emoji} {$household->name}**.")
            ->line('Tu pourras voir ce qu’il reste, ranger tes bouteilles, noter tes dégustations et savoir en un coup d’œil sur quelle clayette dort le dernier magnum.')
            ->action("Rejoindre {$household->name}", $this->invitation->url())
            ->line('Cette invitation est valable '.HouseholdInvitation::VALID_DAYS.' jours.')
            ->salutation('À très vite sur Vinora 🍷');
    }
}
