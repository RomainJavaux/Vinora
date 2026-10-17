import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    History,
    House,
    NotebookPen,
    Plus,
    Users,
    Warehouse,
    Wine,
    X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import AppLogo from '@/components/app-logo';
import { HouseholdSwitcher } from '@/components/layout/household-switcher';
import { UserMenu } from '@/components/layout/user-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { activity, dashboard, tastings } from '@/routes';
import cellars from '@/routes/cellars';
import household from '@/routes/household';
import wines from '@/routes/wines';

type NavItem = {
    title: string;
    short?: string;
    href: string;
    icon: LucideIcon;
    match: string[];
};

function useNavItems(): NavItem[] {
    return [
        {
            title: 'Accueil',
            href: dashboard.url(),
            icon: House,
            match: ['/dashboard'],
        },
        {
            title: 'Mes caves',
            short: 'Caves',
            href: cellars.index.url(),
            icon: Warehouse,
            match: ['/cellars'],
        },
        {
            title: 'Bouteilles',
            href: wines.index.url(),
            icon: Wine,
            match: ['/wines'],
        },
        {
            title: 'Dégustations',
            href: tastings.url(),
            icon: NotebookPen,
            match: ['/tastings'],
        },
        {
            title: 'Activité',
            href: activity.url(),
            icon: History,
            match: ['/activity'],
        },
        {
            title: 'Mon foyer',
            short: 'Foyer',
            href: household.show.url(),
            icon: Users,
            match: ['/household'],
        },
    ];
}

function useIsActive() {
    const { url } = usePage();
    const path = url.split('?')[0];

    return (item: NavItem) =>
        item.match.some(
            (prefix) => path === prefix || path.startsWith(`${prefix}/`),
        ) && !(item.match.includes('/wines') && path === '/wines/create');
}

export function Sidebar() {
    const items = useNavItems();
    const isActive = useIsActive();

    return (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-hairline bg-sidebar/70 px-4 py-6 backdrop-blur-xl lg:flex">
            <Link href={dashboard()} className="mb-6 px-2">
                <AppLogo />
            </Link>

            <HouseholdSwitcher />

            <Button asChild variant="warm" size="lg" className="mt-4 w-full">
                <Link href={wines.create()}>
                    <Plus className="size-5" strokeWidth={2.6} />
                    Ranger une bouteille
                </Link>
            </Button>

            <nav
                className="mt-6 flex flex-col gap-1"
                aria-label="Navigation principale"
            >
                {items.map((item) => {
                    const active = isActive(item);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'relative flex h-11 items-center gap-3 rounded-2xl px-3.5 text-[15px] font-semibold transition-colors',
                                active
                                    ? 'text-foreground'
                                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                            )}
                            aria-current={active ? 'page' : undefined}
                        >
                            {active && (
                                <motion.span
                                    layoutId="sidebar-active"
                                    className="absolute inset-0 rounded-2xl border border-hairline bg-card shadow-soft"
                                    transition={{
                                        type: 'spring',
                                        stiffness: 500,
                                        damping: 40,
                                    }}
                                />
                            )}
                            <item.icon
                                className={cn(
                                    'relative size-5',
                                    active && 'text-primary',
                                )}
                                strokeWidth={active ? 2.4 : 2}
                            />
                            <span className="relative">{item.title}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto border-t border-hairline pt-4">
                <UserMenu />
            </div>
        </aside>
    );
}

export function MobileTopBar() {
    return (
        <header className="pt-safe sticky top-0 z-30 border-b border-hairline bg-background/70 backdrop-blur-xl lg:hidden">
            <div className="flex h-16 items-center justify-between gap-3 px-4">
                <HouseholdSwitcher compact />
                <UserMenu compact />
            </div>
        </header>
    );
}

export function MobileTabBar() {
    const all = useNavItems();
    const isActive = useIsActive();
    const { url } = usePage();
    // The quick actions stay open only on the page where they were opened.
    const [openOn, setOpenOn] = useState<string | null>(null);
    const open = openOn === url;
    const setOpen = (value: boolean) => setOpenOn(value ? url : null);

    const items = [all[0], all[1], all[2], all[5]];
    const left = items.slice(0, 2);
    const right = items.slice(2);

    const tab = (item: NavItem) => {
        const active = isActive(item);

        return (
            <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
                aria-current={active ? 'page' : undefined}
            >
                {active && (
                    <motion.span
                        layoutId="tabbar-active"
                        className="absolute inset-x-1.5 inset-y-1 rounded-[18px] bg-primary/10"
                        transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 38,
                        }}
                    />
                )}
                <motion.span
                    animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="relative"
                >
                    <item.icon
                        className={cn(
                            'size-[22px]',
                            active ? 'text-primary' : 'text-muted-foreground',
                        )}
                        strokeWidth={active ? 2.4 : 2}
                    />
                </motion.span>
                <span
                    className={cn(
                        'relative text-[11px] font-bold',
                        active ? 'text-primary' : 'text-muted-foreground',
                    )}
                >
                    {item.short ?? item.title}
                </span>
            </Link>
        );
    };

    return (
        <>
            <nav
                className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-40 lg:hidden"
                aria-label="Navigation"
            >
                <div className="glass-strong flex h-[68px] items-stretch rounded-[26px] px-1 shadow-float">
                    {left.map(tab)}
                    <div className="flex w-[72px] shrink-0 items-start justify-center">
                        <motion.button
                            type="button"
                            onClick={() => setOpen(!open)}
                            aria-expanded={open}
                            aria-label={
                                open
                                    ? 'Fermer les actions rapides'
                                    : 'Actions rapides'
                            }
                            className="bg-gradient-warm relative -top-7 flex size-[58px] items-center justify-center rounded-[20px] text-warm-foreground shadow-[0_14px_30px_-10px_color-mix(in_oklab,var(--warm)_95%,transparent)] ring-[5px] ring-background"
                            animate={{ rotate: open ? 45 : 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 400,
                                damping: 22,
                            }}
                            whileTap={{ scale: 0.92 }}
                        >
                            <Plus className="size-7" strokeWidth={2.6} />
                        </motion.button>
                    </div>
                    {right.map(tab)}
                </div>
            </nav>
            <QuickActions open={open} onClose={() => setOpen(false)} />
        </>
    );
}

function QuickActions({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const actions = [
        {
            href: wines.create.url(),
            emoji: '🍷',
            title: 'Ranger une bouteille',
            text: 'Photo de l’étiquette, millésime, clayette',
            warm: true,
        },
        {
            href: wines.index.url({ query: { focus: 1 } }),
            emoji: '🥂',
            title: 'Ouvrir une bouteille',
            text: 'Cherche-la et note la dégustation',
            warm: false,
        },
        {
            href: cellars.create.url(),
            emoji: '🗄️',
            title: 'Nouvelle cave',
            text: 'Armoire, casier, cave voûtée…',
            warm: false,
        },
    ];

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[35] flex flex-col justify-end bg-[rgb(30_12_16/0.35)] px-4 pb-[calc(max(env(safe-area-inset-bottom),0.75rem)+96px)] backdrop-blur-md lg:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <div className="flex flex-col gap-3">
                        {actions.map((action, index) => (
                            <motion.div
                                key={action.href}
                                initial={{ opacity: 0, y: 40, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 420,
                                    damping: 30,
                                    delay: (actions.length - 1 - index) * 0.05,
                                }}
                            >
                                <Link
                                    href={action.href}
                                    className={cn(
                                        'flex items-center gap-4 rounded-3xl p-4 shadow-float active:scale-[0.98]',
                                        action.warm
                                            ? 'bg-gradient-warm text-warm-foreground'
                                            : 'glass-strong text-foreground',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-12 items-center justify-center rounded-2xl text-2xl',
                                            action.warm
                                                ? 'bg-white/40'
                                                : 'bg-muted',
                                        )}
                                    >
                                        {action.emoji}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-display text-[17px] font-extrabold">
                                            {action.title}
                                        </span>
                                        <span
                                            className={cn(
                                                'block text-[13px]',
                                                action.warm
                                                    ? 'opacity-80'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            {action.text}
                                        </span>
                                    </span>
                                </Link>
                            </motion.div>
                        ))}
                        <motion.button
                            type="button"
                            onClick={onClose}
                            className="mx-auto mt-1 flex h-10 items-center gap-1.5 rounded-full bg-black/25 px-4 text-sm font-semibold text-white"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <X className="size-4" />
                            Fermer
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}

export function isFocusedPage(component: string): boolean {
    return ['wines/form', 'wines/import', 'cellars/form'].includes(component);
}
