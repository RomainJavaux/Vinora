import { Head, Link, router } from '@inertiajs/react';
import { Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    CellarConfigurator,
    defaultCompartments,
    nextKey,
    toPayload,
} from '@/components/cellar/cellar-configurator';
import type { ConfiguratorValue } from '@/components/cellar/cellar-configurator';
import { PageHeader } from '@/components/page-header';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { bottles, findCellarType, useCatalog } from '@/lib/catalog';
import cellarRoutes from '@/routes/cellars';
import type { Cellar } from '@/types/models';

export default function CellarForm({ cellar }: { cellar: Cellar | null }) {
    const catalog = useCatalog();
    const editing = cellar !== null;
    const [value, setValue] = useState<ConfiguratorValue>(() => {
        if (cellar) {
            return {
                name: cellar.name,
                type: cellar.type,
                color: cellar.color,
                location: cellar.location ?? '',
                notes: cellar.notes ?? '',
                temperature:
                    cellar.temperature !== null
                        ? String(cellar.temperature).replace('.', ',')
                        : '',
                humidity:
                    cellar.humidity !== null ? String(cellar.humidity) : '',
                compartments: cellar.compartments.map((compartment) => ({
                    key: nextKey(),
                    id: compartment.id,
                    name: compartment.name,
                    capacity:
                        compartment.capacity ??
                        findCellarType(catalog, cellar.type).defaultCapacity,
                    itemsCount: compartment.itemsCount,
                })),
            };
        }

        const type = findCellarType(catalog, 'cabinet');

        return {
            name: '',
            type: 'cabinet',
            color: 'bordeaux',
            location: '',
            notes: '',
            temperature: '',
            humidity: '',
            compartments: defaultCompartments(
                type.compartment,
                type.defaultCount,
                type.defaultCapacity,
            ),
        };
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const submit = () => {
        const payload = toPayload({
            ...value,
            name:
                value.name.trim() || findCellarType(catalog, value.type).label,
        });
        const options = {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onError: (next: Record<string, string>) => {
                setErrors(next);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
        };

        if (cellar) {
            router.put(cellarRoutes.update.url(cellar.id), payload, options);
        } else {
            router.post(cellarRoutes.store.url(), payload, options);
        }
    };

    const back = cellar ? cellarRoutes.show(cellar.id) : cellarRoutes.index();
    const units = cellar?.stats.units ?? 0;

    return (
        <>
            <Head
                title={editing ? `Configurer ${cellar.name}` : 'Nouvelle cave'}
            />

            <PageHeader
                back={{
                    href: back,
                    label: editing ? cellar.name : 'Mes caves',
                }}
                overline={editing ? 'Configurer' : 'Nouvelle cave'}
                title={editing ? cellar.name : 'Dessine ta cave'}
                description="Elle apparaîtra telle quelle partout dans l’app : touche une clayette pour l’ouvrir."
                actions={
                    <div className="hidden gap-2 lg:flex">
                        <Button asChild variant="outline">
                            <Link href={back}>Annuler</Link>
                        </Button>
                        <Button onClick={submit} disabled={processing}>
                            <Check />
                            {editing ? 'Enregistrer' : 'Créer la cave'}
                        </Button>
                    </div>
                }
            />

            {Object.keys(errors).length > 0 && (
                <div className="mb-6 rounded-2xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">
                    Quelque chose cloche : vérifie les champs en rouge.
                </div>
            )}

            <CellarConfigurator
                value={value}
                onChange={setValue}
                errors={errors}
                editing={editing}
                footer={
                    editing && (
                        <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
                            <h2 className="font-display text-lg font-bold text-destructive">
                                Supprimer cette cave
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {units > 0
                                    ? `Les ${bottles(units)} qu’elle contient resteront dans l’inventaire, marquées « à ranger ».`
                                    : 'Elle est vide : rien ne sera perdu.'}
                            </p>
                            <Button
                                variant="outline"
                                className="mt-4 text-destructive"
                                onClick={() => setConfirmDelete(true)}
                            >
                                <Trash2 />
                                Supprimer la cave
                            </Button>
                        </section>
                    )
                }
            />

            <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/85 px-4 pt-3 backdrop-blur-xl lg:hidden">
                <div className="flex gap-2">
                    <Button asChild variant="outline" size="lg">
                        <Link href={back}>Annuler</Link>
                    </Button>
                    <Button
                        size="lg"
                        className="min-w-0 flex-1"
                        onClick={submit}
                        disabled={processing}
                    >
                        <Check />
                        {editing ? 'Enregistrer' : 'Créer'}
                    </Button>
                </div>
            </div>

            {cellar && (
                <BottomSheet
                    open={confirmDelete}
                    onOpenChange={setConfirmDelete}
                    title={`Supprimer ${cellar.name} ?`}
                    description={
                        units > 0
                            ? `Les ${bottles(units)} resteront dans l’inventaire, « à ranger ».`
                            : 'Cette action est définitive.'
                    }
                    hero={<span className="text-5xl">🗄️</span>}
                    footer={
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="lg"
                                className="flex-1"
                                onClick={() => setConfirmDelete(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="destructive"
                                size="lg"
                                className="flex-1"
                                onClick={() =>
                                    router.delete(
                                        cellarRoutes.destroy.url(cellar.id),
                                    )
                                }
                            >
                                Supprimer
                            </Button>
                        </div>
                    }
                />
            )}
        </>
    );
}
