import { MapPin, Plus, Split, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { LocationPicker } from '@/components/wines/location-picker';
import { bottles } from '@/lib/catalog';
import type { CellarOption } from '@/types/models';

export type Placement = { compartmentId: number; quantity: number };

type Place = {
    cellar: CellarOption;
    compartment: CellarOption['compartments'][number];
};

export function findPlace(
    cellars: CellarOption[],
    id: number | null,
): Place | null {
    for (const cellar of cellars) {
        const compartment = cellar.compartments.find((item) => item.id === id);

        if (compartment) {
            return { cellar, compartment };
        }
    }

    return null;
}

/** Free places left in a compartment (null when its capacity is unknown). */
export function freePlaces(place: Place | null): number | null {
    if (!place || place.compartment.capacity === null) {
        return null;
    }

    return Math.max(0, place.compartment.capacity - place.compartment.units);
}

/**
 * When the chosen shelf is too small, part of the bottles go elsewhere: the
 * same wine is then stored in several places (one lot per place).
 */
export function SplitPlaces({
    cellars,
    mainId,
    quantity,
    placements,
    onChange,
    error,
}: {
    cellars: CellarOption[];
    mainId: number | null;
    quantity: number;
    placements: Placement[];
    onChange: (placements: Placement[]) => void;
    error?: string;
}) {
    const [picking, setPicking] = useState(false);
    const [target, setTarget] = useState<number | null>(null);
    const elsewhere = placements.reduce(
        (sum, placement) => sum + placement.quantity,
        0,
    );
    const main = findPlace(cellars, mainId);
    const mainQuantity = quantity - elsewhere;
    const free = freePlaces(main);
    const overflow = free !== null ? Math.max(0, mainQuantity - free) : 0;
    const used = new Set([
        mainId,
        ...placements.map((placement) => placement.compartmentId),
    ]);

    if (!main || quantity < 2) {
        return null;
    }

    const add = () => {
        if (target === null || used.has(target)) {
            return;
        }

        const room = freePlaces(findPlace(cellars, target));
        const wanted = overflow > 0 ? overflow : 1;
        const amount = Math.max(
            1,
            Math.min(wanted, room ?? wanted, mainQuantity - 1),
        );

        onChange([...placements, { compartmentId: target, quantity: amount }]);
        setPicking(false);
        setTarget(null);
    };

    const update = (index: number, amount: number) =>
        onChange(
            placements.map((placement, i) =>
                i === index ? { ...placement, quantity: amount } : placement,
            ),
        );

    return (
        <div className="mt-4 space-y-3">
            {overflow > 0 && placements.length === 0 && (
                <div className="rounded-2xl border border-soon/40 bg-soon/10 p-4">
                    <p className="text-sm font-semibold">
                        {free === 0
                            ? `${main.compartment.name} est déjà pleine.`
                            : `Il ne reste que ${free} place${(free ?? 0) > 1 ? 's' : ''} sur ${main.compartment.name}.`}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                        Range les {overflow} autres ailleurs : ce sera le même
                        vin, à deux endroits.
                    </p>
                    <Button
                        type="button"
                        size="sm"
                        className="mt-3"
                        onClick={() => setPicking(true)}
                    >
                        <Split />
                        Répartir
                    </Button>
                </div>
            )}

            {placements.length > 0 && (
                <div className="surface divide-y divide-hairline">
                    <div className="flex items-center gap-3 p-3">
                        <MapPin className="size-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {main.cellar.name} › {main.compartment.name}
                        </span>
                        <span className="text-sm font-bold tabular-nums">
                            {bottles(Math.max(0, mainQuantity))}
                        </span>
                    </div>
                    <AnimatePresence initial={false}>
                        {placements.map((placement, index) => {
                            const place = findPlace(
                                cellars,
                                placement.compartmentId,
                            );
                            const room = freePlaces(place);

                            return (
                                <motion.div
                                    key={placement.compartmentId}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex flex-wrap items-center gap-3 p-3">
                                        <MapPin className="size-4 shrink-0 text-muted-foreground" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold">
                                                {place?.compartment.name ??
                                                    'Emplacement'}
                                            </span>
                                            <span className="block truncate text-[12px] text-muted-foreground">
                                                {place?.cellar.name}
                                                {room !== null &&
                                                    ` · ${room} places libres`}
                                            </span>
                                        </span>
                                        <div className="w-36 shrink-0">
                                            <Stepper
                                                value={placement.quantity}
                                                onChange={(amount) =>
                                                    update(index, amount)
                                                }
                                                min={1}
                                                max={Math.max(
                                                    1,
                                                    placement.quantity +
                                                        mainQuantity -
                                                        1,
                                                )}
                                                label="Bouteilles à cet emplacement"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onChange(
                                                    placements.filter(
                                                        (_, i) => i !== index,
                                                    ),
                                                )
                                            }
                                            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            aria-label="Retirer cet emplacement"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {(placements.length > 0 || overflow === 0) && mainQuantity > 1 && (
                <button
                    type="button"
                    onClick={() => setPicking(true)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                    <Plus className="size-4" />
                    {placements.length > 0
                        ? 'Ajouter un autre emplacement'
                        : 'Répartir sur plusieurs emplacements'}
                </button>
            )}

            {error && (
                <p className="text-[13px] font-medium text-destructive">
                    {error}
                </p>
            )}

            <BottomSheet
                open={picking}
                onOpenChange={setPicking}
                title="Où ranger les autres ?"
                description={
                    overflow > 0
                        ? `${bottles(overflow)} à placer ailleurs`
                        : 'Choisis un autre emplacement pour une partie des bouteilles.'
                }
                footer={
                    <Button
                        size="lg"
                        className="w-full"
                        disabled={target === null || used.has(target)}
                        onClick={add}
                    >
                        {target !== null && used.has(target)
                            ? 'Déjà choisi'
                            : 'Ajouter cet emplacement'}
                    </Button>
                }
            >
                <LocationPicker
                    cellars={cellars}
                    value={target}
                    onChange={setTarget}
                />
            </BottomSheet>
        </div>
    );
}
