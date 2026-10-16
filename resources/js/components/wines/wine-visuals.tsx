import { Link } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';
import {
    bottleShape,
    findCategory,
    findColor,
    gradient,
    statusColor,
    useCatalog,
} from '@/lib/catalog';
import { windowShort } from '@/lib/dates';
import { cn } from '@/lib/utils';
import cellars from '@/routes/cellars';
import type {
    BottleShape,
    CategoryValue,
    DrinkWindowInfo,
    WineLocation,
} from '@/types/models';

const SHAPES: Record<
    BottleShape,
    {
        path: string;
        capsule: number;
        label: [number, number];
        body: [number, number];
    }
> = {
    bordeaux: {
        path: 'M20 4H28V9H27.5V30C27.5 37 40 38 40 48V131Q40 136 35 136H13Q8 136 8 131V48C8 38 20.5 37 20.5 30V9H20Z',
        capsule: 27,
        label: [74, 112],
        body: [8, 40],
    },
    burgundy: {
        path: 'M20 4H28V9H27.5V22C27.5 40 41 46 41 64V131Q41 136 36 136H12Q7 136 7 131V64C7 46 20.5 40 20.5 22V9H20Z',
        capsule: 21,
        label: [80, 114],
        body: [7, 41],
    },
    flute: {
        path: 'M21 4H27V9H26.5V26C26.5 46 35 52 35 70V132Q35 136 31 136H17Q13 136 13 132V70C13 52 21.5 46 21.5 26V9H21Z',
        capsule: 25,
        label: [84, 114],
        body: [13, 35],
    },
    champagne: {
        path: 'M19.5 4H28.5V10H27.5V22C27.5 40 42 46 42 64V130Q42 136 36 136H12Q6 136 6 130V64C6 46 20.5 40 20.5 22V10H19.5Z',
        capsule: 46,
        label: [86, 116],
        body: [6, 42],
    },
};

const CLEAR_GLASS: CategoryValue[] = ['rose', 'sweet', 'orange'];

/**
 * A wine bottle drawn in SVG, its glass, wine, capsule and label tinted by
 * the colour of the wine. The shape follows the region (Bordeaux,
 * Burgundy, Alsatian flute, Champagne).
 */
export function BottleArt({
    category,
    region,
    vintage,
    shape,
    className,
    style,
}: {
    category: CategoryValue;
    region?: string | null;
    vintage?: number | null;
    shape?: BottleShape;
    className?: string;
    style?: CSSProperties;
}) {
    const catalog = useCatalog();
    const id = useId().replace(/:/g, '');
    const option = findCategory(catalog, category);
    const kind = shape ?? bottleShape(catalog, category, region);
    const spec = SHAPES[kind];
    const clear = CLEAR_GLASS.includes(category);
    const [left, right] = spec.body;

    return (
        <svg
            viewBox="0 0 48 140"
            className={cn(
                'h-full w-auto drop-shadow-[0_8px_10px_rgb(30_8_12/0.35)]',
                className,
            )}
            style={style}
            aria-hidden
        >
            <defs>
                <clipPath id={`${id}-clip`}>
                    <path d={spec.path} />
                </clipPath>
                <linearGradient id={`${id}-shade`} x1="0" x2="1">
                    <stop offset="0" stopColor="#000" stopOpacity="0.38" />
                    <stop offset="0.22" stopColor="#000" stopOpacity="0" />
                    <stop offset="0.7" stopColor="#000" stopOpacity="0.05" />
                    <stop offset="1" stopColor="#000" stopOpacity="0.45" />
                </linearGradient>
            </defs>
            <g clipPath={`url(#${id}-clip)`}>
                <rect width="48" height="140" fill={option.glass} />
                {clear && (
                    <rect
                        y="58"
                        width="48"
                        height="82"
                        fill={option.liquid}
                        opacity="0.92"
                    />
                )}
                {category === 'white' && (
                    <rect
                        y="58"
                        width="48"
                        height="82"
                        fill={option.liquid}
                        opacity="0.35"
                    />
                )}
                <rect
                    x={left}
                    y={spec.label[0]}
                    width={right - left}
                    height={spec.label[1] - spec.label[0]}
                    fill="#f6efe2"
                />
                <rect
                    x={left}
                    y={spec.label[0] + 3}
                    width={right - left}
                    height="1"
                    fill={option.capsule}
                    opacity="0.6"
                />
                <rect
                    x={left + (right - left) * 0.25}
                    y={spec.label[0] + 9}
                    width={(right - left) * 0.5}
                    height="3.2"
                    rx="1"
                    fill={option.color}
                    opacity="0.85"
                />
                <rect
                    x={left + (right - left) * 0.18}
                    y={spec.label[0] + 15}
                    width={(right - left) * 0.64}
                    height="1.6"
                    rx="0.8"
                    fill="#3b2a25"
                    opacity="0.35"
                />
                {vintage ? (
                    <text
                        x="24"
                        y={spec.label[1] - 6}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="800"
                        fontFamily="Bricolage Grotesque, sans-serif"
                        fill="#3b2a25"
                        opacity="0.8"
                    >
                        {vintage}
                    </text>
                ) : (
                    <rect
                        x={left + (right - left) * 0.3}
                        y={spec.label[1] - 9}
                        width={(right - left) * 0.4}
                        height="1.6"
                        rx="0.8"
                        fill="#3b2a25"
                        opacity="0.3"
                    />
                )}
                <rect
                    y="0"
                    width="48"
                    height={spec.capsule}
                    fill={option.capsule}
                />
                <rect
                    y={spec.capsule - 2}
                    width="48"
                    height="2"
                    fill="#000"
                    opacity="0.18"
                />
                <rect width="48" height="140" fill={`url(#${id}-shade)`} />
                <rect
                    x={left + 3.5}
                    y={spec.capsule + 6}
                    width="2.6"
                    height={128 - spec.capsule}
                    rx="1.3"
                    fill="#fff"
                    opacity="0.28"
                />
            </g>
        </svg>
    );
}

const AVATAR_SIZES = { sm: 40, md: 56, lg: 80, xl: 112 } as const;

/** Tile with the label photo, or the bottle on a tint of the wine colour. */
export function WineAvatar({
    category,
    region,
    vintage,
    photoUrl,
    size = 'md',
    className,
    rounded,
    muted = false,
}: {
    category: CategoryValue;
    region?: string | null;
    vintage?: number | null;
    photoUrl?: string | null;
    size?: keyof typeof AVATAR_SIZES;
    className?: string;
    rounded?: string;
    muted?: boolean;
}) {
    const catalog = useCatalog();
    const option = findCategory(catalog, category);
    const px = AVATAR_SIZES[size];

    return (
        <span
            className={cn(
                'relative flex shrink-0 items-end justify-center overflow-hidden',
                rounded ?? (size === 'sm' ? 'rounded-xl' : 'rounded-2xl'),
                muted && 'grayscale-[0.7]',
                className,
            )}
            style={{
                width: px,
                height: px,
                background: `linear-gradient(160deg, color-mix(in oklab, ${option.color} 16%, var(--card)), color-mix(in oklab, ${option.color} 30%, var(--card)))`,
            }}
        >
            {photoUrl ? (
                <img
                    src={photoUrl}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                    loading="lazy"
                />
            ) : (
                <BottleArt
                    category={category}
                    region={region}
                    vintage={size === 'sm' ? null : vintage}
                    className="relative"
                    style={{ height: '88%', marginBottom: '-5%' }}
                />
            )}
        </span>
    );
}

/** Big tile (16:10) used in the wine page and the form. */
export function WineHero({
    category,
    region,
    vintage,
    photoUrl,
    children,
    className,
    bounceKey,
}: {
    category: CategoryValue;
    region?: string | null;
    vintage?: number | null;
    photoUrl?: string | null;
    children?: ReactNode;
    className?: string;
    bounceKey?: string;
}) {
    const catalog = useCatalog();
    const option = findCategory(catalog, category);

    return (
        <div
            className={cn(
                'relative aspect-[16/10] w-full overflow-hidden rounded-[28px]',
                className,
            )}
            style={{
                background: `radial-gradient(circle at 50% 70%, color-mix(in oklab, ${option.color} 38%, var(--card)), color-mix(in oklab, ${option.color} 12%, var(--card)) 70%)`,
            }}
        >
            {photoUrl ? (
                <img
                    src={photoUrl}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                />
            ) : (
                <motion.div
                    key={bounceKey ?? category}
                    className="absolute inset-x-0 bottom-[-6%] flex h-[100%] justify-center"
                    initial={{ y: 30, rotate: -6, opacity: 0 }}
                    animate={{ y: 0, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                >
                    <BottleArt
                        category={category}
                        region={region}
                        vintage={vintage}
                        className="h-[96%]"
                    />
                </motion.div>
            )}
            {children}
        </div>
    );
}

/** Pill with a coloured dot (pulsing when the wine should be drunk now). */
export function WindowBadge({
    window,
    className,
    label,
}: {
    window: DrinkWindowInfo;
    className?: string;
    label?: string;
}) {
    const color = statusColor[window.status];
    const pulse = window.status === 'soon' || window.status === 'past';

    return (
        <span
            className={cn(
                'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-semibold whitespace-nowrap',
                className,
            )}
            style={{
                background: `color-mix(in oklab, ${color} 14%, transparent)`,
                color: `color-mix(in oklab, ${color} 70%, var(--foreground))`,
            }}
        >
            <span className="relative flex size-1.5">
                {pulse && (
                    <span
                        className="animate-pulse-dot absolute inset-0 rounded-full"
                        style={{ background: color }}
                    />
                )}
                <span
                    className="relative size-1.5 rounded-full"
                    style={{ background: color }}
                />
            </span>
            {label ?? windowShort(window)}
        </span>
    );
}

/**
 * SVG ring: for a young wine it fills up as the wine gets ready; once
 * ready it shows the time left in the window.
 */
export function WindowRing({
    window,
    size = 78,
    stroke = 6,
    children,
    className,
}: {
    window: DrinkWindowInfo;
    size?: number;
    stroke?: number;
    children?: ReactNode;
    className?: string;
}) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = window.progress ?? 0;
    const value =
        window.status === 'unknown'
            ? 0
            : window.status === 'young'
              ? Math.max(0.04, progress)
              : Math.max(0.04, 1 - progress);

    return (
        <span
            className={cn(
                'relative inline-flex shrink-0 items-center justify-center',
                className,
            )}
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth={stroke}
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={statusColor[window.status]}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference * (1 - value) }}
                    transition={{
                        duration: 1.1,
                        delay: 0.15,
                        ease: [0.16, 1, 0.3, 1],
                    }}
                />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
                {children}
            </span>
        </span>
    );
}

export function QuantityBar({
    quantity,
    initial,
    className,
}: {
    quantity: number;
    initial: number;
    className?: string;
}) {
    const ratio = initial > 0 ? Math.min(1, quantity / initial) : 0;

    return (
        <span
            className={cn(
                'block h-1.5 w-full overflow-hidden rounded-full bg-muted',
                className,
            )}
        >
            <motion.span
                className="block h-full rounded-full"
                style={{
                    background:
                        'linear-gradient(90deg, #fda4af, var(--primary))',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${ratio * 100}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
        </span>
    );
}

/** « ● Cave du salon › Clayette 2 », a link that opens the right shelf. */
export function LocationPill({
    location,
    wineId,
    link = true,
    short = false,
    count,
    className,
}: {
    location: WineLocation | null;
    wineId?: number;
    link?: boolean;
    /** Only the compartment name (when a wine is in several places). */
    short?: boolean;
    /** Bottles stored there. */
    count?: number;
    className?: string;
}) {
    const catalog = useCatalog();

    if (!location) {
        return (
            <span
                className={cn(
                    'inline-flex h-6 items-center gap-1 rounded-full bg-soon/15 px-2.5 text-[11.5px] font-semibold text-foreground',
                    className,
                )}
            >
                <MapPin className="size-3" />À ranger
            </span>
        );
    }

    const content = (
        <>
            <span
                className="flex size-3.5 items-center justify-center rounded-full"
                style={{
                    background: gradient(
                        findColor(catalog, location.cellarColor),
                    ),
                }}
            >
                <MapPin className="size-2 text-white" strokeWidth={3} />
            </span>
            {!short && (
                <>
                    <span className="truncate">{location.cellarName}</span>
                    <span className="text-muted-foreground">›</span>
                </>
            )}
            <span className="truncate">{location.compartmentName}</span>
            {count !== undefined && (
                <span className="text-muted-foreground tabular-nums">
                    · {count}
                </span>
            )}
        </>
    );

    const classes = cn(
        'relative z-10 inline-flex h-6 max-w-full min-w-0 items-center gap-1 rounded-full bg-muted/80 px-2 text-[11.5px] font-semibold whitespace-nowrap',
        link && 'transition-colors hover:bg-accent',
        className,
    );

    if (!link) {
        return <span className={classes}>{content}</span>;
    }

    return (
        <Link
            href={cellars.show(location.cellarId, {
                query: {
                    compartment: location.compartmentId,
                    ...(wineId ? { item: wineId } : {}),
                },
            })}
            className={classes}
            title="Voir où elle est"
        >
            {content}
        </Link>
    );
}

export function RatingBadge({
    rating,
    className,
}: {
    rating: number | null;
    className?: string;
}) {
    if (!rating) {
        return null;
    }

    return (
        <span
            className={cn(
                'inline-flex h-6 items-center gap-0.5 rounded-full bg-warm/20 px-2 text-[11.5px] font-bold text-foreground tabular-nums',
                className,
            )}
        >
            <span className="text-warm">★</span>
            {rating.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
        </span>
    );
}
