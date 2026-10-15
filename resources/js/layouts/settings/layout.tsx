import { Link, usePage } from '@inertiajs/react';
import { Fingerprint, Palette, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

const items = [
    { title: 'Profil', href: editProfile.url(), icon: UserRound },
    { title: 'Sécurité', href: editSecurity.url(), icon: Fingerprint },
    { title: 'Apparence', href: editAppearance.url(), icon: Palette },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { url } = usePage();
    const path = url.split('?')[0];

    return (
        <div>
            <PageHeader overline="Mon compte" title="Réglages" />

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                <nav
                    aria-label="Réglages"
                    className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:w-56 lg:shrink-0 lg:flex-col lg:px-0"
                >
                    {items.map((item) => {
                        const active = path === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'relative flex h-11 shrink-0 items-center gap-2.5 rounded-2xl px-4 text-[15px] font-semibold transition-colors',
                                    active
                                        ? 'text-foreground'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {active && (
                                    <motion.span
                                        layoutId="settings-active"
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
                                        'relative size-[18px]',
                                        active && 'text-primary',
                                    )}
                                />
                                <span className="relative">{item.title}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="min-w-0 flex-1 lg:max-w-2xl">
                    <section className="space-y-6">{children}</section>
                </div>
            </div>
        </div>
    );
}
