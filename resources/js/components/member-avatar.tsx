import { useGradient } from '@/lib/catalog';
import { cn } from '@/lib/utils';

const gradients = [
    'linear-gradient(135deg, #fb7185, #9f1239)',
    'linear-gradient(135deg, #fcd34d, #d97706)',
    'linear-gradient(135deg, #c4b5fd, #6d28d9)',
    'linear-gradient(135deg, #86efac, #15803d)',
    'linear-gradient(135deg, #fdba74, #c2410c)',
    'linear-gradient(135deg, #93c5fd, #1d4ed8)',
    'linear-gradient(135deg, #f0abfc, #a21caf)',
];

export function initials(name: string): string {
    const parts = name.trim().split(/\s+/u).filter(Boolean);

    if (parts.length === 0) {
        return '?';
    }

    const first = Array.from(parts[0])[0] ?? '';
    const last =
        parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : '';

    return (first + last).toUpperCase();
}

export function MemberAvatar({
    id,
    name,
    size = 36,
    className,
}: {
    id: number;
    name: string;
    size?: number;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-background select-none',
                className,
            )}
            style={{
                width: size,
                height: size,
                fontSize: Math.max(10, size * 0.38),
                background: gradients[Math.abs(id) % gradients.length],
            }}
            title={name}
        >
            {initials(name)}
        </span>
    );
}

export function HouseholdBadge({
    emoji,
    color,
    size = 40,
    className,
}: {
    emoji: string;
    color: string;
    size?: number;
    className?: string;
}) {
    const background = useGradient(color);

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-[30%] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]',
                className,
            )}
            style={{
                width: size,
                height: size,
                background,
                fontSize: size * 0.5,
            }}
            aria-hidden
        >
            {emoji}
        </span>
    );
}
