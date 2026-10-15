import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, MapPin, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { CellarVisual } from '@/components/cellar/cellar-visual';
import { EmptyState, PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { findCellarType, findColor, gradient, useCatalog } from '@/lib/catalog';
import cellarRoutes from '@/routes/cellars';
import type { Cellar } from '@/types/models';

export default function CellarsIndex({ cellars }: { cellars: Cellar[] }) {
    return (
        <>
            <Head title="Mes caves" />

            <PageHeader
                overline="Où dorment tes bouteilles"
                title="Mes caves"
                description="Touche une clayette pour l’ouvrir et voir ce qu’elle contient."
                actions={
                    <Button asChild>
                        <Link href={cellarRoutes.create()}>
                            <Plus />
                            Nouvelle
                        </Link>
                    </Button>
                }
            />

            {cellars.length === 0 ? (
                <EmptyState
                    emoji="🗄️"
                    title="Aucune cave"
                    description="Armoire de garde, cave de service, casier mural ou cave voûtée : dessine la tienne en une minute."
                    action={
                        <Button asChild variant="warm">
                            <Link href={cellarRoutes.create()}>
                                Configurer ma cave
                            </Link>
                        </Button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {cellars.map((cellar, index) => (
                        <CellarCard
                            key={cellar.id}
                            cellar={cellar}
                            index={index}
                        />
                    ))}
                </div>
            )}
        </>
    );
}

function CellarCard({ cellar, index }: { cellar: Cellar; index: number }) {
    const catalog = useCatalog();
    const color = findColor(catalog, cellar.color);
    const type = findCellarType(catalog, cellar.type);

    return (
        <motion.article
            className="surface relative overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                type: 'spring',
                stiffness: 260,
                damping: 26,
                delay: index * 0.06,
            }}
            whileHover={{ y: -4 }}
        >
            <div className="relative flex justify-center overflow-hidden px-4 pt-8 pb-6">
                <div
                    className="pointer-events-none absolute inset-0 opacity-35"
                    style={{
                        background: `radial-gradient(circle at 50% 45%, ${color.from}, transparent 65%)`,
                    }}
                />
                <div className="relative z-10 w-full">
                    <CellarVisual
                        type={cellar.type}
                        color={cellar.color}
                        name={cellar.name}
                        size="md"
                        temperature={cellar.temperature}
                        compartments={cellar.compartments}
                        onSelect={(compartment) =>
                            router.visit(
                                cellarRoutes.show(cellar.id, {
                                    query: { compartment },
                                }).url,
                            )
                        }
                    />
                </div>
            </div>
            <div className="flex items-center gap-3 border-t border-hairline px-5 py-4">
                <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: gradient(color) }}
                />
                <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-[17px] font-bold">
                        <Link
                            href={cellarRoutes.show(cellar.id)}
                            className="stretched-link"
                        >
                            {cellar.name}
                        </Link>
                    </h2>
                    <p className="flex items-center gap-1 truncate text-[13px] text-muted-foreground">
                        {type.label}
                        {cellar.location && (
                            <>
                                {' · '}
                                <MapPin className="size-3" />
                                {cellar.location}
                            </>
                        )}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-display text-xl font-extrabold tabular-nums">
                        {cellar.stats.units}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                        {cellar.stats.capacity > 0
                            ? `/ ${cellar.stats.capacity} places`
                            : 'bouteilles'}
                    </p>
                </div>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
            </div>
        </motion.article>
    );
}
