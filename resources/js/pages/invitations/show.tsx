import { Head, Link, router, usePage } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { motion } from 'motion/react';
import AppLogo from '@/components/app-logo';
import { Aurora, Bubbles } from '@/components/fx/aurora';
import { MemberAvatar } from '@/components/member-avatar';
import { Button } from '@/components/ui/button';
import { findColor, gradient, useCatalog } from '@/lib/catalog';
import { dashboard, login, register } from '@/routes';
import invitations from '@/routes/invitations';
import type { PaletteKey } from '@/types/models';

type Props = {
    token: string;
    invitation: {
        status: 'pending' | 'accepted' | 'expired';
        email: string | null;
        role: string;
        invitedBy: string | null;
        household: {
            name: string;
            emoji: string;
            color: PaletteKey;
            members: { id: number; name: string }[];
            cellars: number;
        };
        alreadyMember: boolean;
    } | null;
};

export default function InvitationShow({ token, invitation }: Props) {
    const { auth } = usePage().props;
    const catalog = useCatalog();

    return (
        <div className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-10">
            <Head title="Invitation" />
            <Aurora />

            <Link href="/" className="mb-8">
                <AppLogo />
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="glass-strong w-full max-w-md overflow-hidden rounded-[32px] shadow-float"
            >
                {invitation === null ? (
                    <div className="p-8 text-center">
                        <p className="text-6xl">🤔</p>
                        <h1 className="mt-4 font-display text-2xl font-extrabold">
                            Lien introuvable
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            Ce lien d’invitation n’existe pas. Vérifie qu’il est
                            complet, ou demande-en un nouveau.
                        </p>
                    </div>
                ) : (
                    <>
                        <div
                            className="relative overflow-hidden px-6 pt-8 pb-6 text-center text-white"
                            style={{
                                background: gradient(
                                    findColor(
                                        catalog,
                                        invitation.household.color,
                                    ),
                                ),
                            }}
                        >
                            <div className="hero-veil absolute inset-0" />
                            <Bubbles count={14} seed={9} />
                            <motion.div
                                className="relative mx-auto flex size-20 items-center justify-center rounded-[28px] border border-white/30 bg-white/20 text-5xl backdrop-blur"
                                initial={{ rotate: -180, scale: 0.4 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 220,
                                    damping: 14,
                                    delay: 0.15,
                                }}
                            >
                                {invitation.household.emoji}
                            </motion.div>
                            <p className="relative mt-4 text-sm font-semibold text-white/85">
                                {invitation.invitedBy ?? 'On'} t’invite à
                                rejoindre
                            </p>
                            <h1 className="relative font-display text-3xl font-extrabold">
                                {invitation.household.name}
                            </h1>
                            <div className="relative mt-4 flex items-center justify-center gap-3">
                                <div className="flex -space-x-2">
                                    {invitation.household.members
                                        .slice(0, 5)
                                        .map((member) => (
                                            <MemberAvatar
                                                key={member.id}
                                                id={member.id}
                                                name={member.name}
                                                size={30}
                                                className="ring-white/60"
                                            />
                                        ))}
                                </div>
                                <span className="text-[13px] font-semibold text-white/85">
                                    {invitation.household.cellars} cave
                                    {invitation.household.cellars > 1
                                        ? 's'
                                        : ''}
                                </span>
                            </div>
                        </div>

                        <div className="p-6">
                            {invitation.alreadyMember ? (
                                <div className="text-center">
                                    <p className="font-display text-lg font-bold">
                                        Tu fais déjà partie de ce lieu 🎉
                                    </p>
                                    <Button
                                        asChild
                                        size="lg"
                                        className="mt-4 w-full"
                                    >
                                        <Link href={dashboard()}>Y aller</Link>
                                    </Button>
                                </div>
                            ) : invitation.status !== 'pending' ? (
                                <div className="text-center">
                                    <Clock className="mx-auto size-10 text-muted-foreground" />
                                    <p className="mt-3 font-display text-lg font-bold">
                                        {invitation.status === 'expired'
                                            ? 'Cette invitation a expiré'
                                            : 'Cette invitation a déjà été utilisée'}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Demande un nouveau lien à{' '}
                                        {invitation.invitedBy ??
                                            'la personne qui t’a invité·e'}
                                        .
                                    </p>
                                </div>
                            ) : auth.user ? (
                                <div className="space-y-3 text-center">
                                    <Button
                                        variant="warm"
                                        size="lg"
                                        className="w-full"
                                        onClick={() =>
                                            router.post(
                                                invitations.accept.url(token),
                                            )
                                        }
                                    >
                                        🍷 Rejoindre {invitation.household.name}
                                    </Button>
                                    <p className="text-[13px] text-muted-foreground">
                                        Connecté·e en tant que {auth.user.email}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Button
                                        asChild
                                        variant="warm"
                                        size="lg"
                                        className="w-full"
                                    >
                                        <Link href={register()}>
                                            Créer mon compte
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="lg"
                                        className="w-full"
                                    >
                                        <Link href={login()}>
                                            J’ai déjà un compte
                                        </Link>
                                    </Button>
                                    <p className="text-center text-[13px] text-muted-foreground">
                                        Tu reviendras ici automatiquement après.
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}
