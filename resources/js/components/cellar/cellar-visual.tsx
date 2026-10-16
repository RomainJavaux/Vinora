import { AnimatePresence, motion } from 'motion/react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { useId, useState } from 'react';
import {
    findCategory,
    findCellarType,
    findColor,
    gradient,
    useCatalog,
} from '@/lib/catalog';
import { cn } from '@/lib/utils';
import type { Catalog, CategoryValue, CellarTypeValue } from '@/types/models';

export type VisualCompartment = {
    id: number | string;
    name: string;
    itemsCount?: number;
    units?: number;
    /** Every place, rows behind included. */
    capacity?: number | null;
    /** Places seen from the front (drawn). */
    frontCapacity?: number | null;
    previewBottles?: CategoryValue[];
    urgentCount?: number;
};

export type VisualSize = 'xs' | 'sm' | 'md' | 'lg';

type Props = {
    type: CellarTypeValue;
    color: string;
    name?: string;
    compartments: VisualCompartment[];
    selectedId?: number | string | null;
    /** Compartment that blinks ("Où est-ce ?"). */
    highlightId?: number | string | null;
    onSelect?: (id: number | string) => void;
    size?: VisualSize;
    animateOpening?: boolean;
    temperature?: number | null;
    className?: string;
};

const WIDTHS: Record<CellarTypeValue, Record<VisualSize, number>> = {
    cabinet: { xs: 46, sm: 132, md: 210, lg: 330 },
    service: { xs: 54, sm: 150, md: 230, lg: 340 },
    rack: { xs: 56, sm: 150, md: 230, lg: 360 },
    vault: { xs: 82, sm: 210, md: 320, lg: 460 },
};

export function visualWidth(type: CellarTypeValue, size: VisualSize): number {
    return WIDTHS[type][size];
}

const SHELF_HEIGHTS: Record<VisualSize, [number, number, number]> = {
    xs: [9, 7, 5],
    sm: [30, 22, 16],
    md: [46, 36, 28],
    lg: [66, 50, 40],
};

const BIN_HEIGHTS: Record<VisualSize, number> = {
    xs: 14,
    sm: 46,
    md: 74,
    lg: 104,
};

const shelfHeight = (size: VisualSize, count: number) => {
    const [few, some, many] = SHELF_HEIGHTS[size];

    return count <= 5 ? few : count <= 8 ? some : many;
};

const ease = [0.65, 0, 0.35, 1] as const;

/**
 * The real container drawn in CSS: it gives Vinora its identity and is used
 * everywhere (lists, cellar page, location picker, configurator, landing).
 * Without `onSelect` it is purely decorative (plain divs, safe in a link).
 */
export function CellarVisual({
    type,
    color,
    name,
    compartments,
    selectedId = null,
    highlightId = null,
    onSelect,
    size = 'md',
    animateOpening = false,
    temperature,
    className,
}: Props) {
    const catalog = useCatalog();
    const id = useId();
    const palette = findColor(catalog, color);
    const tint = gradient(palette, 180);
    const width = WIDTHS[type][size];
    const style: CSSProperties = {
        width: size === 'lg' ? `min(100%, ${width}px)` : width,
    };

    const shared = {
        catalog,
        layoutKey: `${id}-ring`,
        tint,
        palette,
        compartments,
        selectedId,
        highlightId,
        onSelect,
        size,
        animateOpening,
        name,
        temperature: temperature ?? findCellarType(catalog, type).temperature,
    };

    return (
        <div
            className={cn('relative mx-auto select-none', className)}
            style={style}
        >
            {type === 'vault' ? (
                <Vault {...shared} />
            ) : type === 'rack' ? (
                <Rack {...shared} />
            ) : (
                <Cabinet {...shared} service={type === 'service'} />
            )}
        </div>
    );
}

type PartProps = {
    catalog: Catalog;
    layoutKey: string;
    tint: string;
    palette: { from: string; to: string };
    compartments: VisualCompartment[];
    selectedId: number | string | null;
    highlightId: number | string | null;
    onSelect?: (id: number | string) => void;
    size: VisualSize;
    animateOpening: boolean;
    name?: string;
    temperature: number | null;
};

/* ------------------------------------------------------------------ */
/* Armoire de garde et cave de service                                 */
/* ------------------------------------------------------------------ */

function Cabinet({ service, ...props }: PartProps & { service: boolean }) {
    const {
        size,
        tint,
        name,
        compartments,
        animateOpening,
        temperature,
        palette,
    } = props;
    const [doorGone, setDoorGone] = useState(!animateOpening);
    const tiny = size === 'xs';
    const radius = size === 'lg' || size === 'md' ? 30 : size === 'sm' ? 20 : 9;
    const h = shelfHeight(size, compartments.length);
    const pad = tiny ? 3 : size === 'sm' ? 6 : 10;
    const inner = tiny ? 2 : size === 'sm' ? 4 : 7;
    const innerWidth =
        WIDTHS[service ? 'service' : 'cabinet'][size] - 2 * (pad + inner) - 4;

    return (
        <div className="relative">
            <div
                className="relative overflow-hidden border border-hairline"
                style={{
                    borderRadius: radius,
                    background:
                        'linear-gradient(160deg, var(--cellar-body-from), var(--cellar-body-to))',
                    boxShadow: tiny
                        ? '0 2px 6px rgb(40 10 15 / 0.15)'
                        : '0 30px 50px -28px rgb(60 15 25 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.7)',
                    padding: tiny ? 3 : size === 'sm' ? 6 : 10,
                }}
            >
                {/* Bandeau supérieur */}
                <div
                    className="relative flex items-center justify-between overflow-hidden"
                    style={{
                        background: tint,
                        borderRadius: tiny ? 5 : size === 'sm' ? 12 : 18,
                        height: tiny
                            ? 7
                            : size === 'sm'
                              ? 20
                              : size === 'md'
                                ? 30
                                : 38,
                        padding: tiny ? 0 : size === 'sm' ? '0 8px' : '0 12px',
                        marginBottom: tiny ? 3 : size === 'sm' ? 5 : 8,
                    }}
                >
                    <span className="absolute inset-x-0 top-0 h-1/2 bg-white/25" />
                    {!tiny && size !== 'sm' && name && (
                        <span className="relative truncate font-display text-[13px] font-bold text-white drop-shadow-sm">
                            {name}
                        </span>
                    )}
                    {(size === 'md' || size === 'lg') &&
                        temperature !== null && (
                            <Lcd text={`${Math.round(temperature)}°`} />
                        )}
                </div>

                {/* Intérieur */}
                <div
                    className="cellar-glow relative overflow-hidden"
                    style={{
                        borderRadius: tiny ? 4 : size === 'sm' ? 12 : 18,
                        padding: tiny ? 2 : size === 'sm' ? 4 : 7,
                        boxShadow: 'inset 0 6px 18px rgb(0 0 0 / 0.55)',
                    }}
                >
                    <div
                        className="flex flex-col"
                        style={{ gap: tiny ? 1.5 : size === 'sm' ? 3 : 5 }}
                    >
                        <AnimatePresence initial={false}>
                            {compartments.map((compartment, index) => (
                                <Compartment
                                    key={compartment.id}
                                    {...props}
                                    compartment={compartment}
                                    index={index}
                                >
                                    <Shelf
                                        {...props}
                                        compartment={compartment}
                                        index={index}
                                        height={h}
                                        innerWidth={innerWidth}
                                    />
                                </Compartment>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Porte vitrée qui s'ouvre */}
                    {!doorGone && (
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{ perspective: 1400 }}
                        >
                            <motion.div
                                className="absolute inset-0 overflow-hidden"
                                style={{
                                    transformOrigin: 'left center',
                                    borderRadius: 'inherit',
                                    background:
                                        'linear-gradient(115deg, rgb(255 255 255 / 0.32), rgb(255 255 255 / 0.06) 40%, rgb(255 255 255 / 0.18) 60%, rgb(255 255 255 / 0.04))',
                                    border: '2px solid rgb(255 255 255 / 0.35)',
                                    backdropFilter: 'blur(1.5px)',
                                }}
                                initial={{ rotateY: 0 }}
                                animate={{ rotateY: -112, opacity: [1, 1, 0] }}
                                transition={{
                                    delay: 0.35,
                                    duration: 1.1,
                                    ease,
                                }}
                                onAnimationComplete={() => setDoorGone(true)}
                            >
                                <span
                                    className="absolute top-1/2 right-[6%] h-1/3 w-1.5 -translate-y-1/2 rounded-full"
                                    style={{
                                        background: `linear-gradient(${palette.from}, ${palette.to})`,
                                    }}
                                />
                            </motion.div>
                        </div>
                    )}
                </div>

                {service && !tiny && (
                    <div
                        className="mx-auto mt-2 rounded-full"
                        style={{
                            height: size === 'sm' ? 4 : 6,
                            width: '70%',
                            background: tint,
                            opacity: 0.6,
                        }}
                    />
                )}
            </div>

            {!tiny && <Feet />}
        </div>
    );
}

function Shelf({
    compartment,
    index,
    height,
    innerWidth,
    size,
    catalog,
    tint,
    animateOpening,
}: PartProps & {
    compartment: VisualCompartment;
    index: number;
    height: number;
    innerWidth: number;
}) {
    const tiny = size === 'xs';
    const strip = tiny
        ? 2
        : size === 'sm'
          ? 5
          : height < 34
            ? 12
            : size === 'md'
              ? 14
              : 18;
    const dotsArea = Math.max(2, height - strip - (tiny ? 0 : 4));
    const units = compartment.units ?? compartment.previewBottles?.length ?? 0;
    const front =
        compartment.frontCapacity ?? compartment.capacity ?? Math.max(units, 6);
    const total = compartment.capacity ?? front;
    const gap = tiny ? 0.5 : size === 'sm' ? 1 : 2;
    const showText = size === 'lg' || (size === 'md' && height >= 34);

    return (
        <div
            className="relative flex flex-col justify-end"
            style={{ minHeight: height }}
        >
            <BottlePile
                catalog={catalog}
                bottles={compartment.previewBottles ?? []}
                units={units}
                front={front}
                total={total}
                maxDot={dotsArea}
                perRowMax={Math.floor(innerWidth / (COMFORT_DOT[size] + gap))}
                gap={gap}
                delay={animateOpening ? 0.5 + index * 0.06 : 0}
                animate={animateOpening}
            />
            <div
                className="wood-texture relative mt-0.5 flex items-center overflow-hidden"
                style={{
                    height: strip,
                    borderRadius: tiny ? 1 : size === 'sm' ? 3 : 6,
                    boxShadow:
                        '0 2px 4px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.25)',
                    paddingLeft: tiny ? 0 : size === 'sm' ? 4 : 10,
                    paddingRight: tiny ? 0 : 8,
                }}
            >
                <span
                    className="absolute inset-y-0 left-0"
                    style={{ width: tiny ? 2 : 4, background: tint }}
                />
                {showText && (
                    <span className="relative flex min-w-0 flex-1 items-center justify-between gap-2 text-white">
                        {height >= 34 && (
                            <span className="truncate text-[11px] font-bold drop-shadow-sm">
                                {compartment.name}
                            </span>
                        )}
                        <CountLabel
                            compartment={compartment}
                            slots={compartment.capacity ?? null}
                            compact={height < 34}
                        />
                    </span>
                )}
            </div>
        </div>
    );
}

function CountLabel({
    compartment,
    slots,
    compact,
}: {
    compartment: VisualCompartment;
    slots: number | null;
    compact?: boolean;
}) {
    const units = compartment.units ?? 0;

    return (
        <span className="ml-auto shrink-0 text-[10.5px] font-semibold whitespace-nowrap tabular-nums drop-shadow-sm">
            {units === 0 ? (
                'Vide'
            ) : compact ? (
                units
            ) : (
                <>
                    {units}
                    {slots ? `/${slots}` : ''}
                    <span className="opacity-80"> bt</span>
                </>
            )}
            {!compact && (compartment.urgentCount ?? 0) > 0 && (
                <span className="text-amber-200">
                    {' '}
                    · {compartment.urgentCount} à boire
                </span>
            )}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Casier mural                                                        */
/* ------------------------------------------------------------------ */

function Rack(props: PartProps) {
    const { size, compartments, name, tint } = props;
    const tiny = size === 'xs';
    const h = shelfHeight(size, compartments.length) - (tiny ? 0 : 4);
    const innerWidth =
        WIDTHS.rack[size] -
        2 *
            ((tiny ? 3 : size === 'sm' ? 6 : 10) +
                (tiny ? 1.5 : size === 'sm' ? 3 : 6)) -
        8;

    return (
        <div className="relative">
            <div
                className="wood-texture relative overflow-hidden"
                style={{
                    borderRadius: tiny ? 5 : size === 'sm' ? 12 : 18,
                    padding: tiny ? 3 : size === 'sm' ? 6 : 10,
                    boxShadow: tiny
                        ? '0 2px 6px rgb(40 10 15 / 0.2)'
                        : '0 28px 44px -26px rgb(60 25 10 / 0.6), inset 0 1px 0 rgb(255 255 255 / 0.3)',
                }}
            >
                {!tiny && size !== 'sm' && (
                    <div className="mb-2 flex justify-center">
                        <span
                            className="relative max-w-[80%] truncate rounded-full px-3 py-0.5 font-display text-[12px] font-bold text-white shadow-sm"
                            style={{ background: tint }}
                        >
                            {name ?? 'Casier'}
                        </span>
                    </div>
                )}
                <div
                    className="relative overflow-hidden"
                    style={{
                        borderRadius: tiny ? 3 : size === 'sm' ? 8 : 12,
                        padding: tiny ? 1.5 : size === 'sm' ? 3 : 6,
                        background:
                            'linear-gradient(180deg, rgb(30 14 8 / 0.85), rgb(20 10 6 / 0.92))',
                        boxShadow: 'inset 0 4px 12px rgb(0 0 0 / 0.6)',
                    }}
                >
                    <div className="lattice absolute inset-0 opacity-60" />
                    <div
                        className="relative flex flex-col"
                        style={{ gap: tiny ? 1.5 : size === 'sm' ? 3 : 5 }}
                    >
                        <AnimatePresence initial={false}>
                            {compartments.map((compartment, index) => (
                                <Compartment
                                    key={compartment.id}
                                    {...props}
                                    compartment={compartment}
                                    index={index}
                                >
                                    <RackRow
                                        {...props}
                                        compartment={compartment}
                                        index={index}
                                        height={h}
                                        innerWidth={innerWidth}
                                    />
                                </Compartment>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RackRow({
    compartment,
    index,
    height,
    innerWidth,
    size,
    catalog,
    tint,
    animateOpening,
}: PartProps & {
    compartment: VisualCompartment;
    index: number;
    height: number;
    innerWidth: number;
}) {
    const tiny = size === 'xs';
    const units = compartment.units ?? compartment.previewBottles?.length ?? 0;
    const front =
        compartment.frontCapacity ?? compartment.capacity ?? Math.max(units, 6);
    const total = compartment.capacity ?? front;
    const label = size === 'lg' || (size === 'md' && height >= 30);
    const pileWidth = label ? innerWidth * 0.62 : innerWidth;
    const gap = tiny ? 0.5 : 2;

    return (
        <div
            className="relative flex items-center"
            style={{
                minHeight: height,
                paddingBlock: tiny ? 0 : 3,
                borderBottom: tiny ? undefined : '3px solid var(--wood-dark)',
                gap: 6,
            }}
        >
            <span
                className="absolute inset-y-1 left-0 rounded-full"
                style={{ width: tiny ? 1.5 : 3, background: tint }}
            />
            <div
                className="min-w-0 flex-1"
                style={{ paddingLeft: tiny ? 2 : 6 }}
            >
                <BottlePile
                    catalog={catalog}
                    bottles={compartment.previewBottles ?? []}
                    units={units}
                    front={front}
                    total={total}
                    maxDot={Math.max(2, height - (tiny ? 1 : 6))}
                    perRowMax={Math.floor(
                        pileWidth / (COMFORT_DOT[size] + gap),
                    )}
                    gap={gap}
                    delay={animateOpening ? 0.3 + index * 0.08 : 0}
                    animate={animateOpening}
                    pop
                />
            </div>
            {label && (
                <span className="flex w-[34%] shrink-0 flex-col items-end pr-1 text-right text-white">
                    <span className="max-w-full truncate text-[11px] font-bold">
                        {compartment.name}
                    </span>
                    <CountLabel
                        compartment={compartment}
                        slots={compartment.capacity ?? null}
                        compact={size === 'md'}
                    />
                </span>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Cave enterrée / voûtée                                              */
/* ------------------------------------------------------------------ */

function Vault(props: PartProps) {
    const {
        size,
        compartments,
        name,
        tint,
        palette,
        animateOpening,
        temperature,
    } = props;
    const [doorsGone, setDoorsGone] = useState(!animateOpening);
    const tiny = size === 'xs';
    const count = compartments.length;
    const cols = count <= 3 ? Math.max(1, count) : count <= 6 ? 3 : 4;
    const width = WIDTHS.vault[size];
    const pad = tiny ? 4 : size === 'sm' ? 8 : 14;
    const gap = tiny ? 2 : size === 'sm' ? 4 : 8;
    const binWidth = (width - pad * 2 - gap * (cols - 1)) / cols;

    return (
        <div className="relative">
            <div
                className="stone-texture relative overflow-hidden border border-hairline"
                style={{
                    borderRadius: tiny
                        ? '40px 40px 6px 6px'
                        : size === 'sm'
                          ? '110px 110px 14px 14px'
                          : '220px 220px 22px 22px / 120px 120px 22px 22px',
                    padding: pad,
                    paddingTop: tiny ? 10 : size === 'sm' ? 24 : 40,
                    boxShadow: tiny
                        ? '0 2px 6px rgb(40 20 10 / 0.2)'
                        : '0 30px 50px -28px rgb(50 30 15 / 0.6), inset 0 2px 0 rgb(255 255 255 / 0.4)',
                }}
            >
                {/* Clé de voûte et plaque */}
                {!tiny && (
                    <div
                        className="absolute inset-x-0 top-0 flex justify-center"
                        style={{ top: size === 'sm' ? 5 : 10 }}
                    >
                        <span
                            className="flex items-center gap-1.5 truncate rounded-full px-3 font-display font-bold text-white shadow"
                            style={{
                                background: tint,
                                fontSize: size === 'sm' ? 9 : 12,
                                height: size === 'sm' ? 14 : 22,
                                maxWidth: '70%',
                            }}
                        >
                            {size !== 'sm' && name}
                            {size !== 'sm' && temperature !== null && (
                                <span className="font-sans text-[10px] opacity-85">
                                    · {Math.round(temperature)}°
                                </span>
                            )}
                        </span>
                    </div>
                )}

                <div
                    className="relative grid"
                    style={{
                        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                        gap,
                    }}
                >
                    <AnimatePresence initial={false}>
                        {compartments.map((compartment, index) => (
                            <Compartment
                                key={compartment.id}
                                {...props}
                                compartment={compartment}
                                index={index}
                                lift
                            >
                                <Bin
                                    {...props}
                                    compartment={compartment}
                                    index={index}
                                    binWidth={binWidth}
                                />
                            </Compartment>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Double porte en bois qui s'ouvre */}
                {!doorsGone && (
                    <div
                        className="pointer-events-none absolute inset-0 flex"
                        style={{ perspective: 1200 }}
                    >
                        {[0, 1].map((side) => (
                            <motion.div
                                key={side}
                                className="wood-texture h-full w-1/2"
                                style={{
                                    transformOrigin:
                                        side === 0
                                            ? 'left center'
                                            : 'right center',
                                    borderRight:
                                        side === 0
                                            ? '1px solid rgb(0 0 0 / 0.3)'
                                            : undefined,
                                    boxShadow:
                                        'inset 0 0 0 3px rgb(0 0 0 / 0.12)',
                                }}
                                initial={{ rotateY: 0 }}
                                animate={{
                                    rotateY: side === 0 ? -105 : 105,
                                    opacity: [1, 1, 0],
                                }}
                                transition={{ delay: 0.35, duration: 1, ease }}
                                onAnimationComplete={() =>
                                    side === 1 && setDoorsGone(true)
                                }
                            >
                                <span
                                    className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full"
                                    style={{
                                        [side === 0 ? 'right' : 'left']: 10,
                                        background: `radial-gradient(circle at 35% 35%, ${palette.from}, ${palette.to})`,
                                    }}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function Bin({
    compartment,
    index,
    size,
    catalog,
    tint,
    binWidth,
    animateOpening,
}: PartProps & {
    compartment: VisualCompartment;
    index: number;
    binWidth: number;
}) {
    const tiny = size === 'xs';
    const height = BIN_HEIGHTS[size];
    const label = tiny ? 0 : size === 'sm' ? 0 : size === 'md' ? 16 : 22;
    const units = compartment.units ?? compartment.previewBottles?.length ?? 0;
    const slots = compartment.capacity ?? Math.max(units, 12);
    const innerW = binWidth - (tiny ? 2 : 8);
    const innerH = height - label - (tiny ? 2 : 8);
    const dot = Math.max(
        2,
        Math.min(
            size === 'lg' ? 13 : 10,
            Math.floor(
                Math.sqrt((innerW * innerH) / Math.max(1, slots)) * 0.86,
            ),
        ),
    );
    const perRow = Math.max(1, Math.floor(innerW / (dot + 1)));
    const rows = Math.max(1, Math.floor(innerH / (dot + 1)));
    const visible = Math.min(slots, perRow * rows);

    return (
        <div
            className="relative flex flex-col overflow-hidden"
            style={{
                height,
                borderRadius: tiny ? 2 : size === 'sm' ? 6 : 10,
                background:
                    'linear-gradient(180deg, rgb(25 12 8 / 0.9), rgb(45 22 12 / 0.85))',
                boxShadow:
                    'inset 0 6px 14px rgb(0 0 0 / 0.65), 0 1px 0 rgb(255 255 255 / 0.4)',
            }}
        >
            <div
                className="flex min-h-0 flex-1 items-end justify-center"
                style={{ padding: tiny ? 1 : 4 }}
            >
                <BottleStack
                    catalog={catalog}
                    bottles={compartment.previewBottles ?? []}
                    units={units}
                    slots={visible}
                    total={slots}
                    dot={dot}
                    perRow={perRow}
                    delay={animateOpening ? 0.55 + index * 0.06 : 0}
                    animate={animateOpening}
                />
            </div>
            {label > 0 && (
                <div
                    className="wood-texture relative flex shrink-0 items-center gap-1 px-2 text-white"
                    style={{ height: label }}
                >
                    <span
                        className="absolute inset-x-0 top-0 h-[3px]"
                        style={{ background: tint }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[10.5px] font-bold">
                        {compartment.name}
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold tabular-nums">
                        {units === 0 ? 'Vide' : units}
                    </span>
                </div>
            )}
            {size === 'sm' && units > 0 && (
                <span className="absolute top-1 right-1 rounded-full bg-black/45 px-1 text-[9px] font-bold text-white tabular-nums">
                    {units}
                </span>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Bouteilles                                                          */
/* ------------------------------------------------------------------ */

function dotStyle(
    catalog: Catalog,
    category: CategoryValue | null,
): CSSProperties {
    if (category === null) {
        return {
            background: 'rgb(255 255 255 / 0.05)',
            boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 0.16)',
        };
    }

    const option = findCategory(catalog, category);

    return {
        background: `radial-gradient(circle at 50% 50%, rgb(0 0 0 / 0.45) 0 26%, ${option.liquid} 30% 66%, color-mix(in oklab, ${option.liquid} 55%, white) 72%, ${option.liquid} 82%)`,
        boxShadow: '0 1px 2px rgb(0 0 0 / 0.5)',
    };
}

/** Bottle size that stays readable, per illustration size. */
const COMFORT_DOT: Record<VisualSize, number> = {
    xs: 4,
    sm: 8,
    md: 13,
    lg: 19,
};

/**
 * Rows of a pile of bottles, bottom row first. When a shelf holds more
 * bottles than fit side by side, they are stacked in staggered rows like
 * in a real wine fridge (each upper row has one bottle less).
 */
export function pileRows(front: number, perRowMax: number): number[] {
    const total = Math.max(1, front);
    const max = Math.max(1, perRowMax);
    let layers = Math.ceil(total / max);
    let perRow = Math.ceil((total + Math.floor(layers / 2)) / layers);

    while (perRow > max && layers < 20) {
        layers += 1;
        perRow = Math.ceil((total + Math.floor(layers / 2)) / layers);
    }

    const rows: number[] = [];
    let remaining = total;

    for (let i = 0; remaining > 0; i++) {
        const count = Math.min(
            remaining,
            i % 2 === 1 && perRow > 1 ? perRow - 1 : perRow,
        );
        rows.push(count);
        remaining -= count;
    }

    return rows;
}

/**
 * Bottle bottoms seen from the front, piled up when needed. Empty places
 * are outlined; bottles stored behind the front row and bottles beyond the
 * capacity are counted in small badges.
 */
function BottlePile({
    catalog,
    bottles,
    units,
    front,
    total,
    maxDot,
    perRowMax,
    gap,
    delay,
    animate,
    pop = false,
}: {
    catalog: Catalog;
    bottles: CategoryValue[];
    units: number;
    /** Places seen from the front (drawn). */
    front: number;
    /** All the places, including the rows behind. */
    total: number;
    maxDot: number;
    perRowMax: number;
    gap: number;
    delay: number;
    animate: boolean;
    pop?: boolean;
}) {
    const drawn = Math.max(1, Math.min(front, 90));
    const rows = pileRows(drawn, perRowMax);
    const perRow = rows[0];
    const behind = Math.max(0, Math.min(units, total) - drawn);
    const overflow = Math.max(0, units - Math.max(total, drawn));
    const dot = `min(${maxDot}px, calc((100% - ${(perRow - 1) * gap}px) / ${perRow}))`;
    const starts = rows.map((_, index) =>
        rows.slice(0, index).reduce((sum, count) => sum + count, 0),
    );

    return (
        <motion.div
            className="relative flex flex-col-reverse"
            initial={
                animate
                    ? pop
                        ? { opacity: 0, scale: 0.85 }
                        : { opacity: 0, y: 10 }
                    : false
            }
            animate={animate ? { opacity: 1, y: 0, scale: 1 } : undefined}
            transition={{ delay, type: 'spring', stiffness: 300, damping: 24 }}
        >
            {rows.map((count, row) => (
                <div
                    key={row}
                    className="flex justify-center"
                    style={{
                        gap,
                        // Upper rows sink a little between the bottles below.
                        marginBottom: row === 0 ? 0 : `calc(${dot} * -0.14)`,
                    }}
                >
                    {Array.from({ length: count }, (_, i) => {
                        const slot = starts[row] + i;
                        const filled = slot < units;
                        const category = filled
                            ? (bottles[slot] ??
                              bottles[bottles.length - 1] ??
                              'red')
                            : null;

                        return (
                            <span
                                key={i}
                                className="aspect-square shrink-0 rounded-full"
                                style={{
                                    width: dot,
                                    ...dotStyle(catalog, category),
                                }}
                            />
                        );
                    })}
                </div>
            ))}
            {(behind > 0 || overflow > 0) && (
                <span className="absolute -top-1.5 right-0 z-[1] flex gap-1">
                    {behind > 0 && (
                        <span
                            className="rounded-full bg-black/55 px-1 text-[9px] font-bold text-white tabular-nums shadow"
                            title={`${behind} bouteille${behind > 1 ? 's' : ''} derrière`}
                        >
                            +{behind} derrière
                        </span>
                    )}
                    {overflow > 0 && (
                        <span
                            className="rounded-full bg-warm px-1 text-[9px] font-extrabold text-warm-foreground tabular-nums shadow"
                            title="Au-delà de la capacité"
                        >
                            +{overflow}
                        </span>
                    )}
                </span>
            )}
        </motion.div>
    );
}
/** Bottles piled up in a bin, from the bottom. */
function BottleStack({
    catalog,
    bottles,
    units,
    slots,
    total,
    dot,
    perRow,
    delay,
    animate,
}: {
    catalog: Catalog;
    bottles: CategoryValue[];
    units: number;
    slots: number;
    total: number;
    dot: number;
    perRow: number;
    delay: number;
    animate: boolean;
}) {
    const overflow = Math.max(0, units - slots);
    const hiddenSlots = total > slots;

    return (
        <motion.div
            className="relative flex flex-wrap-reverse content-start justify-center"
            style={{ gap: 1, width: perRow * (dot + 1) }}
            initial={animate ? { opacity: 0, y: 10 } : false}
            animate={animate ? { opacity: 1, y: 0 } : undefined}
            transition={{ delay, type: 'spring', stiffness: 280, damping: 24 }}
        >
            {Array.from({ length: slots }, (_, i) => {
                const filled = i < units;
                const category = filled
                    ? (bottles[i] ?? bottles[bottles.length - 1] ?? 'red')
                    : null;

                if (!filled && hiddenSlots && i > units + perRow) {
                    return null;
                }

                return (
                    <span
                        key={i}
                        className="shrink-0 rounded-full"
                        style={{
                            width: dot,
                            height: dot,
                            ...dotStyle(catalog, category),
                        }}
                    />
                );
            })}
            {overflow > 0 && (
                <span className="absolute -top-3 right-0 rounded-full bg-warm px-1 text-[9px] font-extrabold text-warm-foreground tabular-nums shadow">
                    +{overflow}
                </span>
            )}
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/* Compartiment interactif                                             */
/* ------------------------------------------------------------------ */

function Compartment({
    compartment,
    index,
    selectedId,
    highlightId,
    onSelect,
    layoutKey,
    palette,
    size,
    lift = false,
    children,
}: PartProps & {
    compartment: VisualCompartment;
    index: number;
    lift?: boolean;
    children: ReactNode;
}) {
    const selected = selectedId !== null && selectedId === compartment.id;
    const dimmed = selectedId !== null && !selected;
    const interactive = onSelect !== undefined;
    const ringColor = palette.from;

    const content = (
        <>
            {children}
            {selected && size !== 'xs' && (
                <motion.span
                    layoutId={layoutKey}
                    className="pointer-events-none absolute -inset-[3px] z-10 rounded-[inherit]"
                    style={{
                        borderRadius: size === 'sm' ? 8 : 12,
                        boxShadow: `0 0 0 2.5px ${ringColor}, 0 10px 26px -8px ${palette.to}`,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                />
            )}
            {highlightId !== null && highlightId === compartment.id && (
                <motion.span
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                        background: ringColor,
                        borderRadius: size === 'sm' ? 8 : 12,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.35, 0, 0.35, 0] }}
                    transition={{ delay: 0.8, duration: 1.8 }}
                />
            )}
        </>
    );

    const motionProps = {
        layout: 'position' as const,
        initial: { opacity: 0, x: -14, scaleY: 0.6 },
        animate: {
            opacity: dimmed ? 0.55 : 1,
            x: 0,
            scaleY: 1,
            scale: selected ? (lift ? 1.06 : 1.07) : 1,
            y: selected ? (lift ? -6 : -2) : 0,
        },
        exit: { opacity: 0, x: 18, scaleY: 0.5 },
        transition: {
            type: 'spring' as const,
            stiffness: 380,
            damping: 26,
            delay: index * 0.035,
            opacity: { duration: 0.2 },
        },
        style: { zIndex: selected ? 10 : undefined },
    };

    if (!interactive) {
        return (
            <motion.div className="relative" {...motionProps}>
                {content}
            </motion.div>
        );
    }

    const activate = () => onSelect?.(compartment.id);

    return (
        <motion.div
            {...motionProps}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`${compartment.name} — ${compartment.units ?? 0} bouteille${(compartment.units ?? 0) > 1 ? 's' : ''}`}
            className="relative cursor-pointer rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-white/50"
            onClick={activate}
            onKeyDown={(event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activate();
                }
            }}
            whileHover={{ scale: selected ? (lift ? 1.06 : 1.07) : 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {content}
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */

function Lcd({ text }: { text: string }) {
    return (
        <span className="relative flex shrink-0 items-center gap-1 rounded-md bg-[rgb(20_10_12/0.55)] px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-amber-300 shadow-inner">
            <span className="animate-pulse-dot size-1.5 rounded-full bg-amber-300" />
            {text}
        </span>
    );
}

function Feet() {
    return (
        <div className="flex justify-between px-[14%]" aria-hidden>
            <span className="h-1.5 w-[12%] rounded-b-md bg-foreground/25" />
            <span className="h-1.5 w-[12%] rounded-b-md bg-foreground/25" />
        </div>
    );
}
