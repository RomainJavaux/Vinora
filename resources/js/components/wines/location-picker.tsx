import { Link } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import { CellarVisual } from '@/components/cellar/cellar-visual';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { findColor, gradient, useCatalog } from '@/lib/catalog';
import { vibrate } from '@/lib/celebrate';
import cellarRoutes from '@/routes/cellars';
import type { CellarOption } from '@/types/models';

/**
 * Choose where to store a bottle by touching the shelf on the drawing.
 */
export function LocationPicker({
    cellars,
    value,
    onChange,
    extra = 0,
}: {
    cellars: CellarOption[];
    value: number | null;
    onChange: (compartmentId: number) => void;
    /** Bottles about to be added (to show how full it will be). */
    extra?: number;
}) {
    const catalog = useCatalog();
    const initial =
        cellars.find((cellar) =>
            cellar.compartments.some((c) => c.id === value),
        ) ?? cellars[0];
    const [cellarId, setCellarId] = useState<number | null>(
        initial?.id ?? null,
    );
    const cellar = cellars.find((item) => item.id === cellarId) ?? cellars[0];

    if (!cellar) {
        return (
            <div className="surface flex flex-col items-center gap-3 p-6 text-center">
                <span className="text-4xl">🗄️</span>
                <p className="font-semibold">Aucune cave pour l’instant</p>
                <p className="text-sm text-muted-foreground">
                    Crée ta première cave pour y ranger tes bouteilles.
                </p>
                <Button asChild variant="outline">
                    <Link href={cellarRoutes.create()}>
                        Configurer une cave
                    </Link>
                </Button>
            </div>
        );
    }

    const selected =
        cellar.compartments.find((compartment) => compartment.id === value) ??
        null;
    const selectedCellar = cellars.find((item) =>
        item.compartments.some((c) => c.id === value),
    );
    const selectedCompartment = selectedCellar?.compartments.find(
        (c) => c.id === value,
    );

    return (
        <div className="space-y-4">
            {cellars.length > 1 && (
                <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
                    {cellars.map((item) => (
                        <Chip
                            key={item.id}
                            active={item.id === cellar.id}
                            color={gradient(findColor(catalog, item.color))}
                            onClick={() => setCellarId(item.id)}
                        >
                            {item.name}
                        </Chip>
                    ))}
                </div>
            )}

            <div className="relative rounded-3xl bg-muted/40 px-3 py-5">
                <CellarVisual
                    type={cellar.type}
                    color={cellar.color}
                    name={cellar.name}
                    size="md"
                    compartments={cellar.compartments.map((compartment) => ({
                        id: compartment.id,
                        name: compartment.name,
                        units:
                            compartment.units +
                            (compartment.id === value ? extra : 0),
                        itemsCount: compartment.itemsCount,
                        capacity: compartment.capacity,
                        previewBottles: compartment.previewBottles,
                    }))}
                    selectedId={selected?.id ?? null}
                    onSelect={(id) => {
                        vibrate(6);
                        onChange(Number(id));
                    }}
                />
            </div>

            {selectedCellar && selectedCompartment ? (
                <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-sm font-semibold">
                    <MapPin className="size-4 text-primary" />
                    {selectedCellar.name} › {selectedCompartment.name}
                    {selectedCompartment.capacity && (
                        <span
                            className={
                                selectedCompartment.units + extra >
                                selectedCompartment.capacity
                                    ? 'text-soon'
                                    : 'text-muted-foreground'
                            }
                        >
                            · {selectedCompartment.units + extra}/
                            {selectedCompartment.capacity} places
                        </span>
                    )}
                </p>
            ) : (
                <p className="text-center text-sm text-muted-foreground">
                    Touche une clayette pour choisir où ranger ta bouteille
                </p>
            )}
        </div>
    );
}
