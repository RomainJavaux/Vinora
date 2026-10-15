import type { DrinkWindowInfo } from '@/types/models';

/**
 * A "day" date (2026-10-15) is read in local time, never in UTC, so it
 * never shifts by one day.
 */
export function parseDay(value: string): Date {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);

    return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function todayIso(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${now.getFullYear()}-${month}-${day}`;
}

export function currentYear(): number {
    return new Date().getFullYear();
}

const capitalize = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

/** « 1 nov. 2026 » */
export function formatDate(
    value: string | null | undefined,
    options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    },
): string {
    if (!value) {
        return '—';
    }

    const date = value.length <= 10 ? parseDay(value) : new Date(value);

    return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

/** « Jeudi 15 octobre » */
export function formatLongToday(): string {
    return capitalize(
        new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        }).format(new Date()),
    );
}

/** « Aujourd’hui », « Hier », sinon « Lundi 12 octobre » (+ année). */
export function formatDay(value: string): string {
    const date = new Date(value);
    const today = new Date();
    const startOf = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000);

    if (diff === 0) {
        return 'Aujourd’hui';
    }

    if (diff === 1) {
        return 'Hier';
    }

    return capitalize(
        new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            ...(date.getFullYear() !== today.getFullYear()
                ? { year: 'numeric' }
                : {}),
        }).format(date),
    );
}

const relative = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

/** « à l’instant », « il y a 3 heures », « hier »… */
export function timeAgo(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
    const abs = Math.abs(seconds);

    if (abs < 45) {
        return 'à l’instant';
    }

    const steps: [Intl.RelativeTimeFormatUnit, number][] = [
        ['minute', 60],
        ['hour', 3600],
        ['day', 86_400],
        ['week', 604_800],
        ['month', 2_629_800],
        ['year', 31_557_600],
    ];

    let unit: Intl.RelativeTimeFormatUnit = 'minute';
    let size = 60;

    for (const [name, length] of steps) {
        if (abs >= length) {
            unit = name;
            size = length;
        }
    }

    return relative.format(Math.round(seconds / size), unit);
}

export function greeting(date = new Date()): string {
    const hour = date.getHours();

    if (hour < 5) {
        return 'Bonne nuit';
    }

    if (hour < 12) {
        return 'Bonjour';
    }

    if (hour < 18) {
        return 'Bon après-midi';
    }

    return 'Bonsoir';
}

const years = (count: number) => `${count} an${count > 1 ? 's' : ''}`;

/**
 * Long label of a drinking window:
 * « Prêt en 2028 », « À boire jusqu’en 2031 », « À boire cette année »,
 * « Passé depuis 2024 ».
 */
export function windowLabel(window: DrinkWindowInfo): string {
    const year = currentYear();

    switch (window.status) {
        case 'young':
            return window.from === year + 1
                ? 'Prêt l’an prochain'
                : `Prêt en ${window.from}`;
        case 'ready':
            return window.until
                ? `À boire jusqu’en ${window.until}`
                : 'Prêt à boire';
        case 'soon':
            return 'À boire cette année';
        case 'past':
            return window.until === year - 1
                ? 'Passé depuis l’an dernier'
                : `Passé depuis ${window.until}`;
        default:
            return 'Sans fenêtre de garde';
    }
}

/** Short label for the badges: « Trop jeune », « À boire », « Dernière année ». */
export function windowShort(window: DrinkWindowInfo): string {
    switch (window.status) {
        case 'young':
            return `Trop jeune · ${window.from}`;
        case 'ready':
            return window.until ? `À boire · ${window.until}` : 'À boire';
        case 'soon':
            return 'À boire cette année';
        case 'past':
            return 'Passé l’apogée';
        default:
            return 'Sans fenêtre';
    }
}

/**
 * What the ring shows in its middle: years left (or years to wait), with a
 * small caption.
 */
export function windowRingText(window: DrinkWindowInfo): {
    value: string;
    caption: string;
} {
    const year = currentYear();

    switch (window.status) {
        case 'young': {
            const wait = (window.from ?? year) - year;

            return { value: years(wait), caption: 'à attendre' };
        }
        case 'ready': {
            if (!window.until) {
                return { value: '∞', caption: 'à boire' };
            }

            return { value: years(window.until - year), caption: 'restants' };
        }
        case 'soon':
            return { value: '< 1 an', caption: 'à boire' };
        case 'past':
            return {
                value: `+${years(year - (window.until ?? year))}`,
                caption: 'de retard',
            };
        default:
            return { value: '—', caption: '' };
    }
}

/** Range « 2024 → 2031 » */
export function windowRange(window: {
    from: number | null;
    until: number | null;
}): string {
    if (window.from && window.until) {
        return `${window.from} → ${window.until}`;
    }

    if (window.from) {
        return `dès ${window.from}`;
    }

    if (window.until) {
        return `jusqu’en ${window.until}`;
    }

    return '—';
}
