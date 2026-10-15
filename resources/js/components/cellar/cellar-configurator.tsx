import { GripVertical, MapPin, Plus, Trash2 } from 'lucide-react';
import {
    AnimatePresence,
    motion,
    Reorder,
    useDragControls,
} from 'motion/react';
import type { ReactNode } from 'react';
import { useId, useRef, useState } from 'react';
import { CellarVisual } from '@/components/cellar/cellar-visual';
import InputError from '@/components/input-error';
import { Chip } from '@/components/ui/chip';
import { Input, Textarea } from '@/components/ui/input';
import { ColorSwatches } from '@/components/ui/pickers';
import { Stepper } from '@/components/ui/stepper';
import { findCellarType, findColor, gradient, useCatalog } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import type { CellarTypeValue, PaletteKey } from '@/types/models';

export type ConfiguratorCompartment = {
    key: string;
    id?: number;
    name: string;
    capacity: number;
    itemsCount?: number;
};

export type ConfiguratorValue = {
    name: string;
    type: CellarTypeValue;
    color: PaletteKey;
    location: string;
    notes: string;
    temperature: string;
    humidity: string;
    compartments: ConfiguratorCompartment[];
};

/** Name given to a new cellar of each type (until the user renames it). */
export const DEFAULT_CELLAR_NAMES: Record<CellarTypeValue, string> = {
    cabinet: 'Cave du salon',
    service: 'Cave de service',
    rack: 'Casier du cellier',
    vault: 'Cave voûtée',
};

let keySeed = 0;
export const nextKey = () => `c${++keySeed}`;

export function defaultCompartments(
    label: string,
    count: number,
    capacity: number,
): ConfiguratorCompartment[] {
    return Array.from({ length: count }, (_, i) => ({
        key: nextKey(),
        name: `${label} ${i + 1}`,
        capacity,
    }));
}

/** Payload sent to the server. */
export function toPayload(value: ConfiguratorValue) {
    return {
        name: value.name.trim(),
        type: value.type,
        color: value.color,
        location: value.location.trim() || null,
        notes: value.notes.trim() || null,
        temperature:
            value.temperature.trim() === ''
                ? null
                : value.temperature.replace(',', '.'),
        humidity: value.humidity.trim() === '' ? null : value.humidity,
        compartments: value.compartments.map((compartment) => ({
            id: compartment.id ?? null,
            name: compartment.name.trim() || 'Sans nom',
            capacity: compartment.capacity,
        })),
    };
}

type Props = {
    value: ConfiguratorValue;
    onChange: (value: ConfiguratorValue) => void;
    errors?: Partial<Record<string, string>>;
    errorPrefix?: string;
    editing?: boolean;
    /** Extra sections (delete zone…). */
    footer?: ReactNode;
};

export function CellarConfigurator({
    value,
    onChange,
    errors = {},
    errorPrefix = '',
    editing = false,
    footer,
}: Props) {
    const catalog = useCatalog();
    const type = findCellarType(catalog, value.type);
    const lastFocused = useRef<number | null>(null);
    const error = (key: string) => errors[`${errorPrefix}${key}`];
    const set = <K extends keyof ConfiguratorValue>(
        key: K,
        next: ConfiguratorValue[K],
    ) => onChange({ ...value, [key]: next });

    const changeType = (next: CellarTypeValue) => {
        if (next === value.type) {
            return;
        }

        const target = findCellarType(catalog, next);
        const isDefault = value.compartments.every(
            (compartment, index) =>
                !compartment.id &&
                compartment.name === `${type.compartment} ${index + 1}`,
        );

        const compartments = isDefault
            ? defaultCompartments(
                  target.compartment,
                  target.defaultCount,
                  target.defaultCapacity,
              )
            : value.compartments.slice(0, target.max).map((compartment) => ({
                  ...compartment,
                  capacity: Math.min(compartment.capacity, target.maxCapacity),
              }));

        const renamed =
            value.name.trim() === '' ||
            Object.values(DEFAULT_CELLAR_NAMES).includes(value.name)
                ? DEFAULT_CELLAR_NAMES[next]
                : value.name;

        onChange({ ...value, type: next, name: renamed, compartments });
    };

    const setCount = (count: number) => {
        const current = value.compartments;

        if (count > current.length) {
            const added = Array.from(
                { length: count - current.length },
                (_, i) => ({
                    key: nextKey(),
                    name: `${type.compartment} ${current.length + i + 1}`,
                    capacity:
                        current[current.length - 1]?.capacity ??
                        type.defaultCapacity,
                }),
            );
            set('compartments', [...current, ...added]);
        } else {
            set('compartments', current.slice(0, count));
        }
    };

    const updateCompartment = (
        index: number,
        patch: Partial<ConfiguratorCompartment>,
    ) => {
        set(
            'compartments',
            value.compartments.map((compartment, i) =>
                i === index ? { ...compartment, ...patch } : compartment,
            ),
        );
    };

    const applySuggestion = (name: string) => {
        const index = lastFocused.current ?? 0;

        if (!value.compartments[index]) {
            return;
        }

        updateCompartment(index, { name });
        lastFocused.current = Math.min(
            index + 1,
            value.compartments.length - 1,
        );
    };

    const capacities = value.compartments.map(
        (compartment) => compartment.capacity,
    );
    const sharedCapacity = capacities.every(
        (capacity) => capacity === capacities[0],
    )
        ? capacities[0]
        : null;

    const preview = (
        <div className="relative flex flex-col items-center rounded-[32px] px-4 py-8">
            <div
                className="pointer-events-none absolute inset-0 rounded-[32px] opacity-30"
                style={{
                    background: `radial-gradient(circle at 50% 40%, ${findColor(catalog, value.color).from}, transparent 65%)`,
                }}
            />
            <CellarVisual
                type={value.type}
                color={value.color}
                name={value.name || type.label}
                size="md"
                temperature={
                    value.temperature
                        ? Number(value.temperature.replace(',', '.'))
                        : null
                }
                compartments={value.compartments.map((compartment) => ({
                    id: compartment.key,
                    name: compartment.name || 'Sans nom',
                    capacity: compartment.capacity,
                    units: 0,
                }))}
            />
            <p className="relative mt-5 text-center text-[13px] font-semibold text-muted-foreground">
                {value.compartments.length}{' '}
                {value.compartments.length > 1
                    ? type.compartmentPlural
                    : type.compartment.toLowerCase()}{' '}
                · {capacities.reduce((sum, capacity) => sum + capacity, 0)}{' '}
                places
            </p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
            <div className="lg:hidden">{preview}</div>

            <div className="min-w-0 space-y-8">
                <Step number={1} title="Quel type de cave ?">
                    <TypeCards
                        value={value.type}
                        color={value.color}
                        onChange={changeType}
                    />
                </Step>

                <Step number={2} title="Comment l’appelle-t-on ?">
                    <div className="space-y-3">
                        <Input
                            value={value.name}
                            onChange={(event) =>
                                set('name', event.target.value)
                            }
                            placeholder={
                                value.type === 'vault'
                                    ? 'Cave voûtée'
                                    : value.type === 'rack'
                                      ? 'Casier du cellier'
                                      : 'Cave du salon'
                            }
                            className="h-14 font-display text-xl font-bold"
                            maxLength={60}
                            aria-label="Nom de la cave"
                        />
                        <InputError message={error('name')} />
                        <div className="relative">
                            <MapPin className="pointer-events-none absolute top-1/2 left-4 z-10 size-[18px] -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={value.location}
                                onChange={(event) =>
                                    set('location', event.target.value)
                                }
                                placeholder="Où se trouve-t-elle ?"
                                className="pl-11"
                                maxLength={60}
                                aria-label="Emplacement"
                            />
                        </div>
                        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
                            {catalog.locations.map((location) => (
                                <Chip
                                    key={location}
                                    size="sm"
                                    active={value.location === location}
                                    onClick={() => set('location', location)}
                                >
                                    {location}
                                </Chip>
                            ))}
                        </div>
                    </div>
                </Step>

                <Step number={3} title="Une couleur pour la reconnaître">
                    <ColorSwatches
                        options={catalog.palette}
                        value={value.color}
                        onChange={(color) => set('color', color)}
                    />
                </Step>

                <Step
                    number={4}
                    title={`Combien de ${type.compartmentPlural} ?`}
                >
                    <div className="space-y-4">
                        <div className="surface p-4">
                            <Stepper
                                value={value.compartments.length}
                                onChange={setCount}
                                min={1}
                                max={type.max}
                                unit={
                                    value.compartments.length > 1
                                        ? type.compartmentPlural
                                        : type.compartment.toLowerCase()
                                }
                                label={`Nombre de ${type.compartmentPlural}`}
                            />
                        </div>

                        <div className="surface flex items-center justify-between gap-4 p-4">
                            <div className="min-w-0">
                                <p className="font-semibold">
                                    Places par {type.compartment.toLowerCase()}
                                </p>
                                <p className="text-[13px] text-muted-foreground">
                                    Pour savoir quand c’est plein. Ajustable une
                                    par une.
                                </p>
                            </div>
                            <div className="w-40 shrink-0">
                                <Stepper
                                    value={
                                        sharedCapacity ??
                                        capacities[0] ??
                                        type.defaultCapacity
                                    }
                                    onChange={(capacity) =>
                                        set(
                                            'compartments',
                                            value.compartments.map(
                                                (compartment) => ({
                                                    ...compartment,
                                                    capacity,
                                                }),
                                            ),
                                        )
                                    }
                                    min={1}
                                    max={type.maxCapacity}
                                    label="Places par compartiment"
                                />
                            </div>
                        </div>

                        <div>
                            <p className="mb-2 text-[13px] text-muted-foreground">
                                Touche une idée pour renommer la{' '}
                                {type.compartment.toLowerCase()} sélectionnée
                            </p>
                            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
                                {catalog.compartmentSuggestions.map(
                                    (suggestion) => (
                                        <Chip
                                            key={suggestion}
                                            size="sm"
                                            onClick={() =>
                                                applySuggestion(suggestion)
                                            }
                                        >
                                            {suggestion}
                                        </Chip>
                                    ),
                                )}
                            </div>
                        </div>

                        <Reorder.Group
                            axis="y"
                            values={value.compartments}
                            onReorder={(next) => set('compartments', next)}
                            className="space-y-2"
                        >
                            <AnimatePresence initial={false}>
                                {value.compartments.map(
                                    (compartment, index) => (
                                        <CompartmentRow
                                            key={compartment.key}
                                            compartment={compartment}
                                            index={index}
                                            color={value.color}
                                            editing={editing}
                                            maxCapacity={type.maxCapacity}
                                            canDelete={
                                                value.compartments.length > 1
                                            }
                                            error={error(
                                                `compartments.${index}.name`,
                                            )}
                                            onFocus={() =>
                                                (lastFocused.current = index)
                                            }
                                            onChange={(patch) =>
                                                updateCompartment(index, patch)
                                            }
                                            onDelete={() =>
                                                set(
                                                    'compartments',
                                                    value.compartments.filter(
                                                        (_, i) => i !== index,
                                                    ),
                                                )
                                            }
                                        />
                                    ),
                                )}
                            </AnimatePresence>
                        </Reorder.Group>
                        <InputError message={error('compartments')} />

                        {value.compartments.length < type.max && (
                            <button
                                type="button"
                                onClick={() =>
                                    setCount(value.compartments.length + 1)
                                }
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                            >
                                <Plus className="size-4" />
                                Ajouter une {type.compartment.toLowerCase()}
                            </button>
                        )}
                    </div>
                </Step>

                <Step number={5} title="Infos pratiques" optional>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <label className="space-y-1.5">
                                <span className="text-sm font-semibold">
                                    🌡️ Température
                                </span>
                                <div className="relative">
                                    <Input
                                        inputMode="decimal"
                                        value={value.temperature}
                                        onChange={(event) =>
                                            set(
                                                'temperature',
                                                event.target.value,
                                            )
                                        }
                                        placeholder={
                                            type.temperature
                                                ? String(type.temperature)
                                                : '12'
                                        }
                                        className="pr-10"
                                    />
                                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground">
                                        °C
                                    </span>
                                </div>
                            </label>
                            <label className="space-y-1.5">
                                <span className="text-sm font-semibold">
                                    💧 Hygrométrie
                                </span>
                                <div className="relative">
                                    <Input
                                        inputMode="numeric"
                                        value={value.humidity}
                                        onChange={(event) =>
                                            set(
                                                'humidity',
                                                event.target.value.replace(
                                                    /[^0-9]/g,
                                                    '',
                                                ),
                                            )
                                        }
                                        placeholder="70"
                                        className="pr-10"
                                    />
                                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground">
                                        %
                                    </span>
                                </div>
                            </label>
                        </div>
                        <InputError
                            message={error('temperature') ?? error('humidity')}
                        />
                        <p className="text-[13px] text-muted-foreground">
                            Idéal pour la garde : entre 10 et 14 °C, avec 60 à
                            80 % d’humidité.
                        </p>
                        <Textarea
                            value={value.notes}
                            onChange={(event) =>
                                set('notes', event.target.value)
                            }
                            placeholder="Notes : la clayette du bas est plus froide, réglage d’hiver…"
                            maxLength={1000}
                            aria-label="Notes"
                        />
                    </div>
                </Step>

                {footer}
            </div>

            <div className="hidden lg:block">
                <div className="sticky top-10">{preview}</div>
            </div>
        </div>
    );
}

function Step({
    number,
    title,
    optional = false,
    children,
}: {
    number: number;
    title: string;
    optional?: boolean;
    children: ReactNode;
}) {
    return (
        <section>
            <div className="mb-3 flex items-center gap-3">
                <span className="bg-gradient-primary flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold text-primary-foreground shadow-soft">
                    {number}
                </span>
                <h2 className="font-display text-lg font-bold">
                    {title}
                    {optional && (
                        <span className="ml-2 text-sm font-medium text-muted-foreground">
                            facultatif
                        </span>
                    )}
                </h2>
            </div>
            {children}
        </section>
    );
}

function TypeCards({
    value,
    color,
    onChange,
}: {
    value: CellarTypeValue;
    color: PaletteKey;
    onChange: (value: CellarTypeValue) => void;
}) {
    const catalog = useCatalog();
    const id = useId();

    return (
        <div className="grid grid-cols-2 gap-3">
            {catalog.cellarTypes.map((type) => {
                const active = type.value === value;

                return (
                    <button
                        key={type.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(type.value)}
                        className="surface relative flex flex-col items-start gap-3 p-4 text-left transition-transform active:scale-[0.98]"
                        style={
                            active
                                ? {
                                      boxShadow: `0 14px 30px -16px ${findColor(catalog, color).to}`,
                                  }
                                : undefined
                        }
                    >
                        {active && (
                            <motion.span
                                layoutId={`${id}-type`}
                                className="pointer-events-none absolute -inset-px rounded-3xl ring-2 ring-primary"
                                transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 38,
                                }}
                            />
                        )}
                        <div className="flex h-16 items-end">
                            <CellarVisual
                                type={type.value}
                                color={color}
                                size="xs"
                                compartments={Array.from(
                                    { length: Math.min(type.defaultCount, 4) },
                                    (_, i) => ({
                                        id: i,
                                        name: '',
                                        units: Math.max(0, 4 - i),
                                        capacity: 5,
                                        previewBottles: [
                                            'red',
                                            'white',
                                            'red',
                                            'sparkling',
                                            'rose',
                                        ],
                                    }),
                                )}
                            />
                        </div>
                        <span>
                            <span className="block font-display font-bold">
                                {type.label}
                            </span>
                            <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">
                                {type.description}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function CompartmentRow({
    compartment,
    index,
    color,
    editing,
    maxCapacity,
    canDelete,
    error,
    onFocus,
    onChange,
    onDelete,
}: {
    compartment: ConfiguratorCompartment;
    index: number;
    color: PaletteKey;
    editing: boolean;
    maxCapacity: number;
    canDelete: boolean;
    error?: string;
    onFocus: () => void;
    onChange: (patch: Partial<ConfiguratorCompartment>) => void;
    onDelete: () => void;
}) {
    const catalog = useCatalog();
    const controls = useDragControls();
    const [confirming, setConfirming] = useState(false);
    const hasItems = (compartment.itemsCount ?? 0) > 0;

    return (
        <Reorder.Item
            value={compartment}
            dragListener={false}
            dragControls={controls}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
            className="relative"
        >
            <div className="surface flex items-center gap-2 rounded-2xl p-2 pl-1.5">
                <button
                    type="button"
                    className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground active:cursor-grabbing"
                    onPointerDown={(event) => controls.start(event)}
                    aria-label="Déplacer"
                >
                    <GripVertical className="size-4" />
                </button>
                <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold text-white"
                    style={{ background: gradient(findColor(catalog, color)) }}
                >
                    {index + 1}
                </span>
                <input
                    value={compartment.name}
                    onChange={(event) => onChange({ name: event.target.value })}
                    onFocus={onFocus}
                    maxLength={40}
                    className="h-10 min-w-0 flex-1 rounded-xl bg-transparent px-2 text-base font-semibold outline-none focus:bg-muted/60"
                    aria-label={`Nom du compartiment ${index + 1}`}
                />
                {editing && hasItems && (
                    <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold sm:inline">
                        {compartment.itemsCount} réf.
                    </span>
                )}
                <label className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-muted/70 px-2 text-[13px] font-semibold">
                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={maxCapacity}
                        value={compartment.capacity}
                        onChange={(event) =>
                            onChange({
                                capacity: Math.max(
                                    1,
                                    Math.min(
                                        maxCapacity,
                                        Number(event.target.value) || 1,
                                    ),
                                ),
                            })
                        }
                        className="w-9 [appearance:textfield] bg-transparent text-right tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label="Nombre de places"
                    />
                    <span className="text-muted-foreground">pl.</span>
                </label>
                {canDelete && (
                    <button
                        type="button"
                        onClick={() => {
                            if (hasItems && !confirming) {
                                setConfirming(true);

                                return;
                            }

                            onDelete();
                        }}
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                            confirming
                                ? 'bg-destructive text-white'
                                : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                        )}
                        aria-label="Supprimer"
                    >
                        <Trash2 className="size-4" />
                    </button>
                )}
            </div>
            {confirming && (
                <p className="mt-1.5 px-2 text-[12.5px] font-medium text-destructive">
                    Cet emplacement contient des bouteilles : elles seront
                    déplacées dans le premier. Touche encore pour confirmer.
                </p>
            )}
            <InputError message={error} className="mt-1 px-2" />
        </Reorder.Item>
    );
}
