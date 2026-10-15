import { router } from '@inertiajs/react';
import { Fingerprint } from 'lucide-react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    return (
        <section className="surface p-6">
            <div className="mb-5 flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ready/15 text-ready">
                    <Fingerprint className="size-6" />
                </span>
                <div>
                    <h2 className="font-display text-lg font-bold">
                        Connexion express
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Connecte-toi avec Face ID, ton empreinte ou le code de
                        ton téléphone. Plus rapide et plus sûr qu’un mot de
                        passe.
                    </p>
                </div>
            </div>

            {passkeys.length > 0 ? (
                <div className="mb-4 overflow-hidden rounded-2xl border border-border">
                    {passkeys.map((passkey) => (
                        <PasskeyItem
                            key={passkey.id}
                            passkey={passkey}
                            onDelete={(id, onError) =>
                                router.delete(destroy.url(id), {
                                    preserveScroll: true,
                                    onError,
                                })
                            }
                        />
                    ))}
                </div>
            ) : (
                <p className="mb-4 rounded-2xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">
                    Aucun appareil pour l’instant. Ajoute celui-ci en un geste.
                </p>
            )}

            <PasskeyRegistration onSuccess={() => router.reload()} />
        </section>
    );
}
