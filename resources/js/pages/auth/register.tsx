import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { login } from '@/routes';
import { store } from '@/routes/register';

export default function Register({ passwordRules }: { passwordRules: string }) {
    const [remember, setRemember] = useState(true);

    return (
        <>
            <Head title="Créer un compte" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Prénom ou surnom</Label>
                            <Input
                                id="name"
                                type="text"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="given-name"
                                name="name"
                                placeholder="Camille"
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                tabIndex={2}
                                autoComplete="email"
                                name="email"
                                placeholder="toi@exemple.fr"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <PasswordInput
                                id="password"
                                required
                                tabIndex={3}
                                autoComplete="new-password"
                                name="password"
                                placeholder="8 caractères minimum"
                                passwordrules={passwordRules}
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                Confirmation
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                required
                                tabIndex={4}
                                autoComplete="new-password"
                                name="password_confirmation"
                                placeholder="Le même, une seconde fois"
                                passwordrules={passwordRules}
                            />
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/70 p-4">
                            <div>
                                <p className="text-sm font-semibold">
                                    Rester connecté
                                </p>
                                <p className="text-[13px] text-muted-foreground">
                                    Recommandé sur ton téléphone.
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
                            variant="warm"
                            size="lg"
                            className="w-full"
                            tabIndex={5}
                            data-test="register-user-button"
                        >
                            {processing && <Spinner />}
                            Créer mon compte
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Déjà un compte ?{' '}
                            <TextLink href={login()} tabIndex={6}>
                                Se connecter
                            </TextLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Bienvenue sur Vinora 🍷',
    description: 'Ta cave, bouteille par bouteille. Gratuit, en deux minutes.',
};
