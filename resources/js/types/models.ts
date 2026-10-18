export type PaletteKey =
    | 'bordeaux'
    | 'gold'
    | 'oak'
    | 'vine'
    | 'plum'
    | 'rose'
    | 'slate'
    | 'night';

export type CategoryValue =
    | 'red'
    | 'white'
    | 'rose'
    | 'sparkling'
    | 'sweet'
    | 'fortified'
    | 'orange'
    | 'other';

export type FormatValue =
    | 'half'
    | 'medium'
    | 'clavelin'
    | 'standard'
    | 'liter'
    | 'magnum'
    | 'jeroboam';

export type CellarTypeValue =
    | 'cabinet'
    | 'service'
    | 'builtin'
    | 'rack'
    | 'wall'
    | 'vault'
    | 'cases'
    | 'cupboard'
    | 'fridge'
    | 'offsite';

export type AgingValue = 'early' | 'medium' | 'long' | 'very_long';

export type RoleValue = 'owner' | 'admin' | 'member';

export type MovementTypeValue =
    | 'added'
    | 'drunk'
    | 'gifted'
    | 'restocked'
    | 'moved'
    | 'updated'
    | 'discarded';

export type WindowStatus = 'young' | 'ready' | 'soon' | 'past' | 'unknown';

export type BottleShape = 'bordeaux' | 'burgundy' | 'flute' | 'champagne';

export type DrinkWindowInfo = {
    status: WindowStatus;
    from: number | null;
    until: number | null;
    daysLeft: number | null;
    daysUntilReady: number | null;
    progress: number | null;
};

export type WineLocation = {
    cellarId: number;
    cellarName: string;
    cellarColor: PaletteKey;
    cellarType: CellarTypeValue;
    compartmentId: number;
    compartmentName: string;
    compartmentPosition: number;
};

export type Wine = {
    id: number;
    name: string;
    producer: string | null;
    category: CategoryValue;
    vintage: number | null;
    appellation: string | null;
    region: string | null;
    country: string | null;
    grapes: string[];
    alcohol: number | null;
    description: string | null;
    photoUrl: string | null;
    quantity: number;
    initialQuantity: number;
    format: FormatValue;
    priceCents: number | null;
    valueCents: number | null;
    purchasedOn: string | null;
    boughtFrom: string | null;
    aging: AgingValue | null;
    drinkFrom: number | null;
    drinkUntil: number | null;
    tags: string[];
    rating: number | null;
    finishedAt: string | null;
    createdAt: string | null;
    window: DrinkWindowInfo;
    compartmentId: number | null;
    location: WineLocation | null;
    createdBy?: { id: number; name: string } | null;
};

export type Compartment = {
    id: number;
    name: string;
    color: PaletteKey | null;
    /** Every place, rows behind included. */
    capacity: number | null;
    /** Places seen from the front. */
    frontCapacity: number | null;
    position: number;
    itemsCount: number;
    units: number;
    urgentCount: number;
    previewBottles: CategoryValue[];
    items: Wine[] | null;
};

export type Cellar = {
    id: number;
    name: string;
    type: CellarTypeValue;
    color: PaletteKey;
    location: string | null;
    notes: string | null;
    temperature: number | null;
    humidity: number | null;
    /** Rows of bottles one behind the other. */
    depth: number;
    position: number;
    compartments: Compartment[];
    stats: { items: number; units: number; urgent: number; capacity: number };
};

export type CellarOption = {
    id: number;
    name: string;
    type: CellarTypeValue;
    color: PaletteKey;
    compartments: {
        id: number;
        name: string;
        position: number;
        capacity: number | null;
        frontCapacity: number | null;
        itemsCount: number;
        units: number;
        previewBottles: CategoryValue[];
    }[];
};

export type Movement = {
    id: number;
    type: MovementTypeValue;
    wineId: number | null;
    wineName: string;
    wineVintage: number | null;
    wineCategory: CategoryValue;
    quantity: number | null;
    rating: number | null;
    note: string | null;
    createdAt: string | null;
    user: { id: number; name: string } | null;
    from: string | null;
    to: string | null;
};

export type WineSuggestion = {
    id: number;
    name: string;
    producer: string | null;
    category: CategoryValue;
    vintage: number | null;
    appellation: string | null;
    region: string | null;
    country: string | null;
    grapes: string[];
    format: FormatValue;
    aging: AgingValue | null;
    alcohol: number | null;
    priceCents: number | null;
    boughtFrom: string | null;
};

export type HouseholdSummary = {
    id: number;
    name: string;
    emoji: string;
    color: PaletteKey;
};

export type CurrentHousehold = HouseholdSummary & {
    role: RoleValue | null;
    sharePrices: boolean;
    canSeePrices: boolean;
};

export type CategoryOption = {
    value: CategoryValue;
    label: string;
    short: string;
    emoji: string;
    color: string;
    glass: string;
    liquid: string;
    capsule: string;
    serving: [number, number] | null;
    servingTip: string | null;
    aging: AgingValue | null;
};

export type FormatOption = {
    value: FormatValue;
    label: string;
    volume: string;
    ml: number;
    singular: string;
    plural: string;
};

export type CellarTypeOption = {
    value: CellarTypeValue;
    label: string;
    short: string;
    description: string;
    compartment: string;
    compartmentPlural: string;
    defaultCount: number;
    max: number;
    defaultCapacity: number;
    maxCapacity: number;
    temperature: number | null;
    maxDepth: number;
    /** Kept cool to be served soon, not to age. */
    forServing: boolean;
};

export type AgingOption = {
    value: AgingValue;
    label: string;
    description: string;
    emoji: string;
    from: number;
    until: number;
};

export type PaletteOption = {
    value: PaletteKey;
    label: string;
    from: string;
    to: string;
};

export type DishOption = {
    value: string;
    label: string;
    emoji: string;
    weights: Partial<Record<CategoryValue, number>>;
};

export type Catalog = {
    categories: CategoryOption[];
    formats: FormatOption[];
    cellarTypes: CellarTypeOption[];
    agings: AgingOption[];
    roles: { value: RoleValue; label: string; description: string }[];
    discardReasons: { value: string; label: string; emoji: string }[];
    palette: PaletteOption[];
    householdEmojis: string[];
    locations: string[];
    regions: { name: string; country: string; shape: BottleShape }[];
    countries: string[];
    grapes: string[];
    boughtFrom: string[];
    dishes: DishOption[];
    compartmentSuggestions: string[];
};
