import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    return (
        <>
            <Head title="Nouveau mot de passe" />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
            >
                {({ processing, errors }) => (
                    <div className="grid gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                readOnly
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">
                                Nouveau mot de passe
                            </Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                autoFocus
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
                                name="password_confirmation"
                                autoComplete="new-password"
                                placeholder="Le même, une seconde fois"
                                passwordrules={passwordRules}
                            />
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            disabled={processing}
                            data-test="reset-password-button"
                        >
                            {processing && <Spinner />}
                            Enregistrer le mot de passe
                        </Button>
                    </div>
                )}
            </Form>
        </>
    );
}

ResetPassword.layout = {
    title: 'Nouveau mot de passe',
    description: 'Choisis-en un que tu n’utilises nulle part ailleurs.',
};
