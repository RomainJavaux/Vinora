import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import InputError from '@/components/input-error';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    passwordRules: string;
} & ManagePasskeysProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Sécurité" />

            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />

            <section className="surface p-6">
                <h2 className="font-display text-lg font-bold">Mot de passe</h2>
                <p className="mt-1 mb-5 text-sm text-muted-foreground">
                    Long, unique, et que tu n’utilises nulle part ailleurs.
                </p>

                <Form
                    {...SecurityController.update.form()}
                    options={{ preserveScroll: true }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="space-y-5"
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="current_password">
                                    Mot de passe actuel
                                </Label>
                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    autoComplete="current-password"
                                />
                                <InputError message={errors.current_password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    Nouveau mot de passe
                                </Label>
                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    autoComplete="new-password"
                                    placeholder="8 caractères minimum"
                                    passwordrules={props.passwordRules}
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
                                    passwordrules={props.passwordRules}
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                disabled={processing}
                                data-test="update-password-button"
                            >
                                {processing && <Spinner />}
                                Mettre à jour
                            </Button>
                        </>
                    )}
                </Form>
            </section>
        </>
    );
}
