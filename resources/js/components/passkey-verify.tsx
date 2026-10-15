import type { UrlMethodPair } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { usePasskeyVerify } from '@laravel/passkeys/react';
import { Fingerprint } from 'lucide-react';
import InputError from '@/components/input-error';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    routes?: {
        options: UrlMethodPair;
        submit: UrlMethodPair;
    };
    label?: string;
    hint?: string;
    loadingLabel?: string;
    separator?: string;
};

/**
 * « Connexion express » : passkeys (Face ID, fingerprint or phone code).
 */
export default function PasskeyVerify({
    routes,
    label,
    hint,
    loadingLabel,
    separator,
}: Props = {}) {
    const { verify, isLoading, error, isSupported } = usePasskeyVerify({
        ...(routes && {
            routes: {
                options: routes.options.url,
                submit: routes.submit.url,
            },
        }),
        onSuccess: (response) => {
            router.visit(response.redirect ?? '/dashboard');
        },
    });

    if (!isSupported) {
        return null;
    }

    return (
        <>
            <div className="grid gap-2">
                <button
                    type="button"
                    onClick={verify}
                    disabled={isLoading}
                    className="flex w-full items-center gap-4 rounded-3xl border border-ready/30 bg-ready/10 p-4 text-left transition-[transform,background-color] hover:bg-ready/15 active:scale-[0.98] disabled:opacity-60"
                >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ready text-white shadow-[0_10px_24px_-10px_var(--ready)]">
                        {isLoading ? (
                            <Spinner className="size-6" />
                        ) : (
                            <Fingerprint className="size-6" />
                        )}
                    </span>
                    <span>
                        <span className="block font-display text-[17px] font-extrabold">
                            {isLoading
                                ? (loadingLabel ?? 'Vérification…')
                                : (label ?? 'Connexion express')}
                        </span>
                        <span className="block text-[13px] text-muted-foreground">
                            {hint ?? 'Face ID, empreinte ou code du téléphone'}
                        </span>
                    </span>
                </button>
                {error && (
                    <InputError message={error} className="text-center" />
                )}
            </div>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[11px] font-bold tracking-wider uppercase">
                    <span className="bg-background px-3 text-muted-foreground">
                        {separator ?? 'Ou avec ton e-mail'}
                    </span>
                </div>
            </div>
        </>
    );
}
