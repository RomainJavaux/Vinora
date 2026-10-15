import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    const [remember, setRemember] = useState(true);

    return (
        <>
            <Head title="Connexion" />

            {status && (
                <div className="mb-5 rounded-2xl bg-ready/10 p-3 text-center text-sm font-semibold text-ready">
                    {status}
                </div>
            )}

            <PasskeyVerify />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email webauthn"
                                placeholder="toi@exemple.fr"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Mot de passe</Label>
                                {canResetPassword && (
                                    <TextLink
                                        href={request()}
                                        className="ml-auto text-sm"
                                        tabIndex={5}
                                    >
                                        Oublié ?
                                    </TextLink>
                                )}
                            </div>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                placeholder="••••••••"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/70 p-4">
                            <div>
                                <p
                                    className="text-sm font-semibold"
                                    id="remember-label"
                                >
                                    Rester connecté
                                </p>
                                <p className="text-[13px] text-muted-foreground">
                                    Ouvre l’app directement, sans te
                                    reconnecter.
                                </p>
                            </div>
                            <Switch
                                checked={remember}
                                onChange={setRemember}
                                name="remember"
                                aria-label="Rester connecté"
                            />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            tabIndex={4}
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            Se connecter
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Pas encore de compte ?{' '}
                            <TextLink href={register()} tabIndex={5}>
                                Créer un compte
                            </TextLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Content de te revoir 👋',
    description: 'Ta cave t’attend.',
};
