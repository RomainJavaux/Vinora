import { Form, Head, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { MemberAvatar } from '@/components/member-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function Profile() {
    const { auth } = usePage().props;
    const user = auth.user;

    if (!user) {
        return null;
    }

    return (
        <>
            <Head title="Mon profil" />

            <section className="surface p-6">
                <div className="mb-6 flex items-center gap-4">
                    <MemberAvatar id={user.id} name={user.name} size={72} />
                    <div className="min-w-0">
                        <h2 className="truncate font-display text-2xl font-extrabold">
                            {user.name}
                        </h2>
                        <p className="truncate text-sm text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </div>

                <Form
                    {...ProfileController.update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Prénom ou surnom</Label>
                                <Input
                                    id="name"
                                    defaultValue={user.name}
                                    name="name"
                                    required
                                    autoComplete="given-name"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    defaultValue={user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <Button
                                disabled={processing}
                                data-test="update-profile-button"
                            >
                                {processing && <Spinner />}
                                Enregistrer
                            </Button>
                        </>
                    )}
                </Form>
            </section>

            <DeleteUser />
        </>
    );
}
