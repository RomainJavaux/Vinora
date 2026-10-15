import { usePage } from '@inertiajs/react';
import type {
    AgingValue,
    BottleShape,
    Catalog,
    CategoryOption,
    CellarTypeOption,
    FormatOption,
    PaletteOption,
    WindowStatus,
} from '@/types/models';

let cachedCatalog: Catalog | null = null;

/**
 * The catalog is shared once per browsing session: keep the last copy so
 * pages loaded later (where the prop is absent) still get it.
 */
export function useCatalog(): Catalog {
    const { catalog } = usePage().props;

    if (catalog) {
        cachedCatalog = catalog;
    }

    return (catalog ?? cachedCatalog) as Catalog;
}

const fallbackCategory: CategoryOption = {
    value: 'other',
    label: 'Autre',
    short: 'Autre',
    emoji: '🍶',
    color: '#64748b',
    glass: '#94a3b8',
    liquid: '#cbd5e1',
    capsule: '#475569',
    serving: null,
    servingTip: null,
    aging: null,
};

export function findCategory(
    catalog: Catalog,
    value: string | null | undefined,
): CategoryOption {
    return (
        catalog.categories.find((category) => category.value === value) ??
        catalog.categories.find((category) => category.value === 'other') ??
        fallbackCategory
    );
}

export function findFormat(
    catalog: Catalog,
    value: string | null | undefined,
): FormatOption {
    return (
        catalog.formats.find((format) => format.value === value) ??
        catalog.formats.find((format) => format.value === 'standard')!
    );
}

export function findCellarType(
    catalog: Catalog,
    value: string | null | undefined,
): CellarTypeOption {
    return (
        catalog.cellarTypes.find((type) => type.value === value) ??
        catalog.cellarTypes[0]
    );
}

export function findAging(catalog: Catalog, value: AgingValue | null) {
    return catalog.agings.find((aging) => aging.value === value) ?? null;
}

export function findColor(
    catalog: Catalog,
    value: string | null | undefined,
): PaletteOption {
    return (
        catalog.palette.find((color) => color.value === value) ??
        catalog.palette[0]
    );
}

/** The 135° gradient of a palette colour. */
export function gradient(color: PaletteOption, angle = 135): string {
    return `linear-gradient(${angle}deg, ${color.from}, ${color.to})`;
}

export function useGradient(value: string | null | undefined) {
    const catalog = useCatalog();

    return gradient(findColor(catalog, value));
}

/** « 1 bouteille », « 6 bouteilles », « 2 magnums ». */
export function formatQuantity(
    catalog: Catalog,
    quantity: number,
    format: string,
): string {
    return `${quantity.toLocaleString('fr-FR')} ${unitWord(catalog, quantity, format)}`;
}

export function unitWord(
    catalog: Catalog,
    quantity: number,
    format: string,
): string {
    const option = findFormat(catalog, format);

    return quantity > 1 ? option.plural : option.singular;
}

export function bottles(quantity: number): string {
    return `${quantity.toLocaleString('fr-FR')} bouteille${quantity > 1 ? 's' : ''}`;
}

/** The usual bottle shape for a wine, from its colour and its region. */
export function bottleShape(
    catalog: Catalog,
    category: string,
    region?: string | null,
): BottleShape {
    if (category === 'sparkling') {
        return 'champagne';
    }

    const known = region
        ? catalog.regions.find(
              (item) => item.name.toLowerCase() === region.toLowerCase(),
          )
        : undefined;

    if (known) {
        return known.shape === 'champagne' ? 'bordeaux' : known.shape;
    }

    return 'bordeaux';
}

export const statusColor: Record<WindowStatus, string> = {
    young: 'var(--young)',
    ready: 'var(--ready)',
    soon: 'var(--soon)',
    past: 'var(--past)',
    unknown: 'var(--muted-foreground)',
};

export function isUrgent(status: WindowStatus): boolean {
    return status === 'soon' || status === 'past';
}

/** « 42,50 € » */
export function formatPrice(cents: number | null | undefined): string {
    if (cents === null || cents === undefined) {
        return '—';
    }

    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
}

/** « 1 240 € » with no cents, for totals. */
export function formatAmount(cents: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(cents / 100);
}

/** « Château Talbot 2016 » */
export function wineTitle(wine: {
    name: string;
    vintage: number | null;
}): string {
    return wine.vintage ? `${wine.name} ${wine.vintage}` : wine.name;
}
