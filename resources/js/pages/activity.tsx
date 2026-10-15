import { Head } from '@inertiajs/react';
import { motion } from 'motion/react';
import { MovementEntry } from '@/components/activity/movement-entry';
import { EmptyState, PageHeader } from '@/components/page-header';
import { formatDay } from '@/lib/dates';
import type { Movement } from '@/types/models';

export default function Activity({ movements }: { movements: Movement[] }) {
    const groups = movements.reduce<{ day: string; items: Movement[] }[]>(
        (list, movement) => {
            const day = formatDay(
                movement.createdAt ?? new Date().toISOString(),
            );
            const last = list[list.length - 1];

            if (last && last.day === day) {
                last.items.push(movement);
            } else {
                list.push({ day, items: [movement] });
            }

            return list;
        },
        [],
    );

    const sum = (types: string[]) =>
        movements
            .filter((m) => types.includes(m.type))
            .reduce((total, m) => total + (m.quantity ?? 0), 0);

    const totals = [
        {
            emoji: '📦',
            label: 'bouteilles rangées',
            value: sum(['added', 'restocked']),
        },
        { emoji: '🍷', label: 'bouteilles bues', value: sum(['drunk']) },
        { emoji: '🎁', label: 'offertes', value: sum(['gifted']) },
        { emoji: '🗑️', label: 'perdues', value: sum(['discarded']) },
    ];

    return (
        <>
            <Head title="Activité" />
            <PageHeader
                overline="Qui a fait quoi"
                title="Activité"
                description="Tout ce qui est entré et sorti de tes caves."
            />

            {movements.length === 0 ? (
                <EmptyState
                    emoji="📜"
                    title="Rien pour l’instant"
                    description="L’histoire de ta cave commencera avec la première bouteille rangée."
                />
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
                    <div className="space-y-5">
                        {groups.map((group, index) => (
                            <motion.section
                                key={group.day}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: Math.min(index, 8) * 0.05,
                                }}
                            >
                                <h2 className="mb-2 px-1 font-display text-[15px] font-bold text-muted-foreground">
                                    {group.day}
                                </h2>
                                <div className="surface relative p-5">
                                    <span
                                        className="absolute top-8 bottom-8 left-[38px] w-px bg-border"
                                        aria-hidden
                                    />
                                    <div className="relative space-y-5">
                                        {group.items.map((movement) => (
                                            <MovementEntry
                                                key={movement.id}
                                                movement={movement}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </motion.section>
                        ))}
                    </div>

                    <aside className="lg:sticky lg:top-10 lg:self-start">
                        <div className="surface grid grid-cols-2 gap-3 p-5 lg:grid-cols-1">
                            {totals.map((total) => (
                                <div
                                    key={total.label}
                                    className="flex items-center gap-3"
                                >
                                    <span className="text-2xl">
                                        {total.emoji}
                                    </span>
                                    <span>
                                        <span className="block font-display text-xl font-extrabold tabular-nums">
                                            {total.value}
                                        </span>
                                        <span className="block text-[12px] text-muted-foreground">
                                            {total.label}
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-2 px-1 text-[12px] text-muted-foreground">
                            Sur les {movements.length} derniers mouvements.
                        </p>
                    </aside>
                </div>
            )}
        </>
    );
}
