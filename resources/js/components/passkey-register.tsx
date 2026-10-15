import { usePasskeyRegister } from '@laravel/passkeys/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function deviceName(): string {
    const ua = navigator.userAgent;

    const browser = [
        { pattern: /Edg|Edge/, name: 'Edge' },
        { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
        { pattern: /Firefox|FxiOS/, name: 'Firefox' },
        { pattern: /Chrome|CriOS/, name: 'Chrome' },
        { pattern: /Safari/, name: 'Safari' },
    ].find(({ pattern }) => pattern.test(ua))?.name;

    const os = [
        { pattern: /iPhone/, name: 'iPhone' },
        { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
        { pattern: /Android/, name: 'Android' },
        { pattern: /Mac/, name: 'Mac' },
        { pattern: /Windows/, name: 'Windows' },
    ].find(({ pattern }) => pattern.test(ua))?.name;

    return [browser, os].filter(Boolean).join(' sur ');
}

export default function PasskeyRegistration({
    onSuccess,
}: {
    onSuccess: () => void;
}) {
    const [name, setName] = useState(deviceName);
    const [showForm, setShowForm] = useState(false);
    const { register, isLoading, error, isSupported } = usePasskeyRegister({
        onSuccess: () => {
            setShowForm(false);
            onSuccess();
        },
    });

    if (!isSupported) {
        return (
            <p className="text-sm text-muted-foreground">
                Ce navigateur ne gère pas encore la connexion express.
            </p>
        );
    }

    if (!showForm) {
        return (
            <Button onClick={() => setShowForm(true)}>
                <Plus />
                Ajouter cet appareil
            </Button>
        );
    }

    return (
        <form
            onSubmit={async (event) => {
                event.preventDefault();

                if (name.trim()) {
                    await register(name.trim());
                }
            }}
            className="space-y-4 rounded-2xl bg-muted/60 p-4"
        >
            <div className="grid gap-2">
                <Label htmlFor="passkey-name">Nom de l’appareil</Label>
                <Input
                    id="passkey-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="iPhone de Camille"
                    autoFocus
                />
                <p className="text-[13px] text-muted-foreground">
                    Pour le reconnaître plus tard.
                </p>
            </div>

            {error && <InputError message={error} />}

            <div className="flex gap-2">
                <Button type="submit" disabled={isLoading || !name.trim()}>
                    {isLoading ? 'Enregistrement…' : 'Activer'}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                >
                    Annuler
                </Button>
            </div>
        </form>
    );
}
