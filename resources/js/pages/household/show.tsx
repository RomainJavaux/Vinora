import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Copy,
    Crown,
    EllipsisVertical,
    Link2,
    LogOut,
    Pencil,
    Plus,
    Shield,
    Share2,
    Trash2,
    UserPlus,
    X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { HouseholdBadge, MemberAvatar } from '@/components/member-avatar';
import { PageHeader } from '@/components/page-header';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorSwatches, EmojiGrid } from '@/components/ui/pickers';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { Bubbles } from '@/components/fx/aurora';
import { useClipboard } from '@/hooks/use-clipboard';
import { findColor, gradient, useCatalog } from '@/lib/catalog';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { onboarding } from '@/routes';
import householdRoutes from '@/routes/household';
import households from '@/routes/households';
import invitations from '@/routes/invitations';
import members from '@/routes/members';
import type { HouseholdSummary, RoleValue } from '@/types/models';

type Member = {
    id: number;
    name: string;
    email: string;
    role: RoleValue;
    joinedAt: string | null;
    isMe: boolean;
};
type Invitation = {
    id: number;
    email: string | null;
    role: RoleValue;
    url: string;
    expiresAt: string;
    invitedBy: string | null;
};

type Props = {
    members: Member[];
    invitations: Invitation[];
    otherHouseholds: HouseholdSummary[];
    stats: {
        cellars: number;
        items: number;
        units: number;
        createdAt: string | null;
    };
    can: {
        update: boolean;
        manageMembers: boolean;
        delete: boolean;
        leave: boolean;
    };
};

const ROLE_BADGES: Record<
    RoleValue,
    { label: string; icon: typeof Crown | null; className: string }
> = {
    owner: {
        label: 'Propriétaire',
        icon: Crown,
        className: 'bg-warm/25 text-foreground',
    },
    admin: {
        label: 'Admin',
        icon: Shield,
        className: 'bg-primary/12 text-primary',
    },
    member: {
        label: 'Membre',
        icon: null,
        className: 'bg-muted text-muted-foreground',
    },
};

export default function HouseholdShow(props: Props) {
    const { household } = usePage().props;
    const catalog = useCatalog();
    const [editing, setEditing] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (!household) {
        return null;
    }

    const since = props.stats.createdAt
        ? formatDate(props.stats.createdAt, { month: 'long', year: 'numeric' })
        : null;

    return (
        <>
            <Head title="Mon foyer" />
            <PageHeader
                overline="Ceux qui partagent la cave"
                title="Mon foyer"
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
                <div className="min-w-0 space-y-6">
                    <section
                        className="relative overflow-hidden rounded-[32px] p-6 text-white shadow-float"
                        style={{
                            background: gradient(
                                findColor(catalog, household.color),
                            ),
                        }}
                    >
                        <div className="hero-veil absolute inset-0" />
                        <Bubbles count={10} seed={household.id + 7} />
                        <div className="relative flex items-center gap-4">
                            <span className="flex size-16 shrink-0 items-center justify-center rounded-3xl border border-white/30 bg-white/20 text-3xl backdrop-blur">
                                {household.emoji}
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="truncate font-display text-2xl font-extrabold">
                                    {household.name}
                                </h2>
                                <p className="text-[13px] font-semibold text-white/85">
                                    {props.members.length} membre
                                    {props.members.length > 1 ? 's' : ''} ·{' '}
                                    {props.stats.cellars} cave
                                    {props.stats.cellars > 1 ? 's' : ''} ·{' '}
                                    {props.stats.units} bouteille
                                    {props.stats.units > 1 ? 's' : ''}
                                    {since && ` · depuis ${since}`}
                                </p>
                            </div>
                            {props.can.update && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="shrink-0 bg-white/90 text-foreground hover:bg-white"
                                    onClick={() => setEditing(true)}
                                >
                                    <Pencil />
                                    <span className="hidden sm:inline">
                                        Personnaliser
                                    </span>
                                </Button>
                            )}
                        </div>
                    </section>

                    <section className="surface p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="font-display text-lg font-bold">
                                Membres
                            </h2>
                            {props.can.manageMembers && (
                                <Button
                                    size="sm"
                                    onClick={() => setInviting(true)}
                                >
                                    <UserPlus />
                                    Inviter
                                </Button>
                            )}
                        </div>
                        <ul className="divide-y divide-hairline">
                            {props.members.map((member) => (
                                <MemberRow
                                    key={member.id}
                                    member={member}
                                    canManage={props.can.manageMembers}
                                />
                            ))}
                        </ul>
                    </section>

                    {props.can.manageMembers &&
                        props.invitations.length > 0 && (
                            <section className="surface p-5">
                                <h2 className="mb-3 font-display text-lg font-bold">
                                    Invitations en attente
                                </h2>
                                <ul className="space-y-2">
                                    {props.invitations.map((invitation) => (
                                        <PendingInvitation
                                            key={invitation.id}
                                            invitation={invitation}
                                        />
                                    ))}
                                </ul>
                            </section>
                        )}
                </div>

                <aside className="space-y-4 lg:sticky lg:top-10 lg:self-start">
                    <section className="surface p-5">
                        <h2 className="mb-3 font-display text-lg font-bold">
                            Mes autres lieux
                        </h2>
                        {props.otherHouseholds.length > 0 && (
                            <ul className="mb-3 space-y-1">
                                {props.otherHouseholds.map((other) => (
                                    <li key={other.id}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.put(
                                                    households.switch(other.id)
                                                        .url,
                                                )
                                            }
                                            className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-accent/60"
                                        >
                                            <HouseholdBadge
                                                emoji={other.emoji}
                                                color={other.color}
                                                size={36}
                                            />
                                            <span className="min-w-0 flex-1 truncate font-semibold">
                                                {other.name}
                                            </span>
                                            <span className="text-[12px] font-semibold text-primary">
                                                Y aller
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Button asChild variant="outline" className="w-full">
                            <Link href={onboarding({ query: { new: 1 } })}>
                                <Plus />
                                Créer un lieu (maison de campagne…)
                            </Link>
                        </Button>
                    </section>

                    <section className="rounded-3xl border border-destructive/25 bg-destructive/5 p-5">
                        <h2 className="mb-1 font-display text-lg font-bold text-destructive">
                            Zone sensible
                        </h2>
                        {props.can.leave && (
                            <>
                                <p className="mb-3 text-sm text-muted-foreground">
                                    Tu ne verras plus les caves de{' '}
                                    {household.name}.
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full text-destructive"
                                    onClick={() => setLeaving(true)}
                                >
                                    <LogOut />
                                    Quitter ce lieu
                                </Button>
                            </>
                        )}
                        {props.can.delete && (
                            <>
                                <p className="mb-3 text-sm text-muted-foreground">
                                    Supprime le lieu, ses caves, ses bouteilles
                                    et leur historique, pour tout le monde.
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full text-destructive"
                                    onClick={() => setDeleting(true)}
                                >
                                    <Trash2 />
                                    Supprimer ce lieu
                                </Button>
                            </>
                        )}
                    </section>
                </aside>
            </div>

            {props.can.update && (
                <EditSheet open={editing} onOpenChange={setEditing} />
            )}
            {props.can.manageMembers && (
                <InviteSheet open={inviting} onOpenChange={setInviting} />
            )}

            <BottomSheet
                open={leaving}
                onOpenChange={setLeaving}
                title={`Quitter ${household.name} ?`}
                description="Tu pourras revenir si quelqu’un t’invite à nouveau."
                hero={<span className="text-5xl">👋</span>}
                footer={
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="lg"
                            className="flex-1"
                            onClick={() => setLeaving(false)}
                        >
                            Rester
                        </Button>
                        <Button
                            variant="destructive"
                            size="lg"
                            className="flex-1"
                            onClick={() =>
                                router.post(householdRoutes.leave.url())
                            }
                        >
                            Quitter
                        </Button>
                    </div>
                }
            />

            {props.can.delete && (
                <DeleteSheet
                    open={deleting}
                    onOpenChange={setDeleting}
                    name={household.name}
                />
            )}
        </>
    );
}

function MemberRow({
    member,
    canManage,
}: {
    member: Member;
    canManage: boolean;
}) {
    const badge = ROLE_BADGES[member.role];
    const manageable = canManage && !member.isMe && member.role !== 'owner';

    return (
        <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <MemberAvatar id={member.id} name={member.name} size={42} />
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                    {member.name}
                    {member.isMe && (
                        <span className="font-normal text-muted-foreground">
                            {' '}
                            (toi)
                        </span>
                    )}
                </p>
                <p className="truncate text-[13px] text-muted-foreground">
                    {member.email}
                </p>
            </div>
            <span
                className={cn(
                    'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold',
                    badge.className,
                )}
            >
                {badge.icon && <badge.icon className="size-3.5" />}
                {badge.label}
            </span>
            {manageable && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Gérer ${member.name}`}
                        >
                            <EllipsisVertical />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onSelect={() =>
                                router.patch(
                                    members.update.url(member.id),
                                    {
                                        role:
                                            member.role === 'admin'
                                                ? 'member'
                                                : 'admin',
                                    },
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <Shield />
                            {member.role === 'admin'
                                ? 'Repasser membre'
                                : 'Passer admin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={() =>
                                router.delete(members.destroy.url(member.id), {
                                    preserveScroll: true,
                                })
                            }
                        >
                            <X />
                            Retirer du foyer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </li>
    );
}

function PendingInvitation({ invitation }: { invitation: Invitation }) {
    const [, copy] = useClipboard();

    return (
        <li className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card">
                <Link2 className="size-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                    {invitation.email ?? 'Lien d’invitation'}
                </p>
                <p className="text-[12px] text-muted-foreground">
                    {ROLE_BADGES[invitation.role].label} · expire le{' '}
                    {formatDate(invitation.expiresAt, {
                        day: 'numeric',
                        month: 'long',
                    })}
                </p>
            </div>
            <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Copier le lien"
                onClick={async () => {
                    if (await copy(invitation.url)) {
                        toast.success('Lien copié');
                    }
                }}
            >
                <Copy />
            </Button>
            <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Annuler l’invitation"
                onClick={() =>
                    router.delete(invitations.destroy.url(invitation.id), {
                        preserveScroll: true,
                    })
                }
            >
                <X />
            </Button>
        </li>
    );
}

function EditSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { household } = usePage().props;
    const catalog = useCatalog();
    const [name, setName] = useState(household?.name ?? '');
    const [emoji, setEmoji] = useState(household?.emoji ?? '🏠');
    const [color, setColor] = useState(household?.color ?? 'bordeaux');
    const [sharePrices, setSharePrices] = useState(
        household?.sharePrices ?? true,
    );
    const [error, setError] = useState<string | undefined>();

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Personnaliser le lieu"
            hero={<HouseholdBadge emoji={emoji} color={color} size={64} />}
            footer={
                <Button
                    size="lg"
                    className="w-full"
                    onClick={() =>
                        router.patch(
                            householdRoutes.update.url(),
                            { name, emoji, color, share_prices: sharePrices },
                            {
                                preserveScroll: true,
                                onSuccess: () => onOpenChange(false),
                                onError: (errors) => setError(errors.name),
                            },
                        )
                    }
                >
                    Enregistrer
                </Button>
            }
        >
            <div className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="household-name">Nom</Label>
                    <Input
                        id="household-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={60}
                    />
                    <InputError message={error} />
                </div>
                <EmojiGrid
                    emojis={catalog.householdEmojis}
                    value={emoji}
                    onChange={setEmoji}
                />
                <ColorSwatches
                    options={catalog.palette}
                    value={color}
                    onChange={setColor}
                />
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
                    <div>
                        <p id="share-prices-label" className="font-semibold">
                            Prix visibles par tous
                        </p>
                        <p className="text-[13px] text-muted-foreground">
                            Sinon, seuls les admins voient les prix et la valeur
                            de la cave.
                        </p>
                    </div>
                    <Switch
                        checked={sharePrices}
                        onChange={setSharePrices}
                        aria-label="Prix visibles par tous"
                    />
                </div>
            </div>
        </BottomSheet>
    );
}

function InviteSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { household } = usePage().props;
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'member' | 'admin'>('member');
    const [result, setResult] = useState<{
        url: string;
        email: string | null;
        emailed: boolean;
    } | null>(null);
    const [qr, setQr] = useState<string | null>(null);
    const [error, setError] = useState<string | undefined>();
    const [, copy] = useClipboard();

    useEffect(() => {
        if (!result) {
            return;
        }

        let active = true;
        void QRCode.toDataURL(result.url, {
            width: 440,
            margin: 1,
            color: { dark: '#2a1418', light: '#ffffff' },
        }).then((url) => active && setQr(url));

        return () => {
            active = false;
        };
    }, [result]);

    useEffect(() => {
        return router.on('flash', (event) => {
            const invitation = event.detail.flash.invitation;

            if (invitation) {
                setResult(invitation);
            }
        });
    }, []);

    const create = () => {
        setError(undefined);
        router.post(
            invitations.store.url(),
            { email: email.trim() || null, role },
            {
                preserveScroll: true,
                onError: (errors) => setError(errors.email ?? errors.role),
            },
        );
    };

    const share = async () => {
        if (!result) {
            return;
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Rejoins ${household?.name} sur Vinora`,
                    text: 'Je t’invite à partager notre cave 🍷',
                    url: result.url,
                });

                return;
            } catch {
                // Cancelled: fall back to copying.
            }
        }

        if (await copy(result.url)) {
            toast.success('Lien copié');
        }
    };

    const reset = () => {
        setResult(null);
        setQr(null);
        setEmail('');
        setRole('member');
    };

    return (
        <BottomSheet
            open={open}
            onOpenChange={(value) => {
                onOpenChange(value);

                if (!value) {
                    reset();
                }
            }}
            title={result ? 'Invitation prête ! 🎉' : 'Inviter quelqu’un'}
            description={
                result
                    ? 'Fais scanner le QR code ou partage le lien.'
                    : 'Un lien valable 7 jours, à envoyer par message ou par e-mail.'
            }
            footer={
                result ? (
                    <div className="flex gap-2">
                        <Button variant="outline" size="lg" onClick={reset}>
                            Nouvelle
                        </Button>
                        <Button
                            size="lg"
                            className="flex-1"
                            onClick={() => void share()}
                        >
                            <Share2 />
                            Partager
                        </Button>
                    </div>
                ) : (
                    <Button size="lg" className="w-full" onClick={create}>
                        Créer le lien d’invitation
                    </Button>
                )
            }
        >
            {result ? (
                <div className="space-y-4">
                    <div className="mx-auto w-full max-w-[260px] rounded-3xl bg-white p-4 shadow-soft">
                        {qr ? (
                            <img
                                src={qr}
                                alt="QR code d’invitation"
                                className="w-full"
                            />
                        ) : (
                            <div className="skeleton aspect-square rounded-2xl" />
                        )}
                    </div>
                    {result.email && (
                        <p
                            className={cn(
                                'text-center text-sm font-semibold',
                                result.emailed ? 'text-ready' : 'text-soon',
                            )}
                        >
                            {result.emailed
                                ? `✉️ E-mail envoyé à ${result.email}`
                                : 'L’e-mail n’a pas pu partir : partage le lien'}
                        </p>
                    )}
                    <div className="flex items-center gap-2 rounded-2xl bg-muted/70 p-2 pl-4">
                        <span className="min-w-0 flex-1 truncate text-sm">
                            {result.url}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                                if (await copy(result.url)) {
                                    toast.success('Lien copié');
                                }
                            }}
                        >
                            <Copy />
                            Copier
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="invite-email">
                            E-mail{' '}
                            <span className="font-normal text-muted-foreground">
                                (facultatif)
                            </span>
                        </Label>
                        <Input
                            id="invite-email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="camille@exemple.fr"
                        />
                        <InputError message={error} />
                    </div>
                    <div className="space-y-2">
                        <Label>Rôle</Label>
                        <Segmented
                            className="w-full"
                            value={role}
                            onChange={setRole}
                            options={[
                                { value: 'member', label: 'Membre' },
                                { value: 'admin', label: 'Admin' },
                            ]}
                        />
                        <p className="text-[13px] text-muted-foreground">
                            {role === 'admin'
                                ? 'Peut aussi personnaliser le lieu, inviter et gérer les membres.'
                                : 'Peut ranger, boire, noter et configurer les caves.'}
                        </p>
                    </div>
                </div>
            )}
        </BottomSheet>
    );
}

function DeleteSheet({
    open,
    onOpenChange,
    name,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    name: string;
}) {
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState<string | undefined>();

    return (
        <BottomSheet
            open={open}
            onOpenChange={onOpenChange}
            title={`Supprimer ${name} ?`}
            description="Toutes les caves, bouteilles, photos et dégustations seront supprimées pour tous les membres."
            hero={<span className="text-5xl">⚠️</span>}
            footer={
                <Button
                    variant="destructive"
                    size="lg"
                    className="w-full"
                    disabled={confirmation !== name}
                    onClick={() =>
                        router.delete(householdRoutes.destroy.url(), {
                            data: { confirmation },
                            onError: (errors) => setError(errors.confirmation),
                        })
                    }
                >
                    Supprimer définitivement
                </Button>
            }
        >
            <div className="space-y-2">
                <Label htmlFor="confirm-name">
                    Tape <strong>{name}</strong> pour confirmer
                </Label>
                <Input
                    id="confirm-name"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off"
                />
                <InputError message={error} />
            </div>
        </BottomSheet>
    );
}
