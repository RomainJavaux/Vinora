import { Link, router, usePage } from '@inertiajs/react';
import {
    Fingerprint,
    History,
    LogOut,
    Moon,
    NotebookPen,
    Palette,
    Sun,
    UserRound,
} from 'lucide-react';
import { MemberAvatar } from '@/components/member-avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { clearOfflineCache } from '@/lib/pwa';
import { cn } from '@/lib/utils';
import { activity, logout, tastings } from '@/routes';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

export function UserMenu({ compact = false }: { compact?: boolean }) {
    const { auth } = usePage().props;
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const user = auth.user;

    if (!user) {
        return null;
    }

    const signOut = () => {
        clearOfflineCache();
        router.flushAll();
        router.post(logout.url());
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    'flex min-w-0 items-center gap-3 rounded-2xl text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/25',
                    compact ? 'rounded-full' : 'w-full p-2 hover:bg-accent/70',
                )}
                aria-label="Mon compte"
            >
                <MemberAvatar
                    id={user.id}
                    name={user.name}
                    size={compact ? 38 : 40}
                />
                {!compact && (
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">
                            {user.name}
                        </span>
                        <span className="block truncate text-[13px] text-muted-foreground">
                            {user.email}
                        </span>
                    </span>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align={compact ? 'end' : 'start'}
                side={compact ? 'bottom' : 'top'}
                className="w-64"
            >
                <DropdownMenuLabel className="normal-case">
                    <span className="block truncate text-sm font-bold tracking-normal text-foreground">
                        {user.name}
                    </span>
                    <span className="block truncate text-[12px] font-medium tracking-normal">
                        {user.email}
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={editProfile()}>
                        <UserRound />
                        Mon profil
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={editSecurity()}>
                        <Fingerprint />
                        Sécurité & connexion express
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={editAppearance()}>
                        <Palette />
                        Apparence
                    </Link>
                </DropdownMenuItem>
                {compact && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href={tastings()}>
                                <NotebookPen />
                                Carnet de dégustation
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={activity()}>
                                <History />
                                Historique
                            </Link>
                        </DropdownMenuItem>
                    </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onSelect={(event) => {
                        event.preventDefault();
                        updateAppearance(
                            resolvedAppearance === 'dark' ? 'light' : 'dark',
                        );
                    }}
                >
                    {resolvedAppearance === 'dark' ? <Sun /> : <Moon />}
                    {resolvedAppearance === 'dark'
                        ? 'Mode clair'
                        : 'Mode sombre'}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={signOut}>
                    <LogOut />
                    Se déconnecter
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
