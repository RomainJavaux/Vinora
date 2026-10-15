import { Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import type { Passkey } from '@/types/auth';

type Props = {
    passkey: Passkey;
    onDelete: (id: number, onError: () => void) => void;
};

export default function PasskeyItem({ passkey, onDelete }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);

    return (
        <div className="flex items-center justify-between gap-3 border-b border-border p-4 last:border-b-0">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Smartphone className="size-5 text-muted-foreground" />
                </span>
                <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold">
                        {passkey.name}
                        {passkey.authenticator && (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                                {passkey.authenticator}
                            </span>
                        )}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        Ajoutée {passkey.created_at_diff}
                        {passkey.last_used_at_diff && (
                            <> · utilisée {passkey.last_used_at_diff}</>
                        )}
                    </p>
                </div>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10"
                        aria-label="Supprimer"
                    >
                        <Trash2 />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogTitle>Retirer « {passkey.name} » ?</DialogTitle>
                    <DialogDescription>
                        Tu ne pourras plus te connecter avec cet appareil sans
                        mot de passe.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Annuler</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={() => {
                                setIsDeleting(true);
                                onDelete(passkey.id, () =>
                                    setIsDeleting(false),
                                );
                            }}
                        >
                            {isDeleting ? 'Suppression…' : 'Retirer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
