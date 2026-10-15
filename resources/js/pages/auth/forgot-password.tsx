import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Mot de passe oublié" />

            {status && (
                <div className="mb-5 rounded-2xl bg-ready/10 p-3 text-center text-sm font-semibold text-ready">
                    {status}
                </div>
            )}

            <Form {...email.form()} className="space-y-5">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                autoFocus
                                placeholder="toi@exemple.fr"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <Button
                            size="lg"
                            className="w-full"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing && <Spinner />}
                            Recevoir le lien
                        </Button>
                    </>
                )}
            </Form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Ça te revient ? <TextLink href={login()}>Se connecter</TextLink>
            </p>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Mot de passe oublié',
    description: 'On t’envoie un lien pour en choisir un nouveau.',
};
