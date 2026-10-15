import { usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Aurora } from '@/components/fx/aurora';
import {
    isFocusedPage,
    MobileTabBar,
    MobileTopBar,
    Sidebar,
} from '@/components/layout/navigation';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: ReactNode }) {
    const page = usePage();
    const focused = isFocusedPage(page.component);
    // The transition plays when the page changes, not after an action that
    // comes back to the same page with another query string.
    const key = `${page.component}:${page.url.split('?')[0]}`;

    return (
        <div className="relative min-h-dvh">
            <Aurora />
            <Sidebar />

            <div className="lg:pl-72">
                <MobileTopBar />
                <main
                    className={cn(
                        'mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16',
                        focused ? 'pb-36' : 'pb-32',
                    )}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={key}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                transition: {
                                    duration: 0.35,
                                    ease: [0.16, 1, 0.3, 1],
                                },
                                transitionEnd: { transform: 'none' },
                            }}
                            exit={{
                                opacity: 0,
                                y: -8,
                                transition: { duration: 0.12 },
                            }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {!focused && <MobileTabBar />}
        </div>
    );
}
