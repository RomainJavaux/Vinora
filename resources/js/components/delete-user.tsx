import { Form } from '@inertiajs/react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <section className="rounded-3xl border border-destructive/25 bg-destructive/5 p-6">
            <h2 className="font-display text-lg font-bold text-destructive">
                Supprimer mon compte
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
                Ton compte et tes données seront supprimés. Les lieux dont tu es
                propriétaire seront supprimés pour tous leurs membres.
            </p>

            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="destructive"
                        className="mt-4"
                        data-test="delete-user-button"
                    >
                        Supprimer mon compte
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogTitle>Tu es sûr·e ?</DialogTitle>
                    <DialogDescription>
                        C’est définitif : caves, bouteilles, dégustations et
                        photos des lieux que tu possèdes disparaîtront. Tape ton
                        mot de passe pour confirmer.
                    </DialogDescription>

                    <Form
                        {...ProfileController.destroy.form()}
                        options={{ preserveScroll: true }}
                        onError={() => passwordInput.current?.focus()}
                        resetOnSuccess
                        className="space-y-5"
                    >
                        {({ resetAndClearErrors, processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="delete-password"
                                        className="sr-only"
                                    >
                                        Mot de passe
                                    </Label>
                                    <PasswordInput
                                        id="delete-password"
                                        name="password"
                                        ref={passwordInput}
                                        placeholder="Mot de passe"
                                        autoComplete="current-password"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                resetAndClearErrors()
                                            }
                                        >
                                            Annuler
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        variant="destructive"
                                        disabled={processing}
                                        asChild
                                    >
                                        <button
                                            type="submit"
                                            data-test="confirm-delete-user-button"
                                        >
                                            Supprimer définitivement
                                        </button>
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
