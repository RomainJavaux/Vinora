import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowRightLeft,
    Gift,
    PackagePlus,
    Pencil,
    Plus,
    Trash2,
    Wine,
} from 'lucide-react';
import { MemberAvatar } from '@/components/member-avatar';
import { StarRating } from '@/components/ui/pickers';
import { findCategory, useCatalog } from '@/lib/catalog';
import { timeAgo } from '@/lib/dates';
import { cn } from '@/lib/utils';
import wines from '@/routes/wines';
import type { Movement, MovementTypeValue } from '@/types/models';

const ACTIONS: Record<
    MovementTypeValue,
    { verb: string; icon: LucideIcon; color: string }
> = {
    added: { verb: 'a rangé', icon: Plus, color: '#0ea5e9' },
    drunk: { verb: 'a bu', icon: Wine, color: '#be123c' },
    gifted: { verb: 'a offert', icon: Gift, color: '#db2777' },
    restocked: { verb: 'a rajouté', icon: PackagePlus, color: '#059669' },
    moved: { verb: 'a déplacé', icon: ArrowRightLeft, color: '#7c3aed' },
    updated: { verb: 'a modifié', icon: Pencil, color: '#64748b' },
    discarded: { verb: 'a jeté', icon: Trash2, color: '#e11d48' },
};

export function movementColor(type: MovementTypeValue): string {
    return ACTIONS[type].color;
}

export function MovementEntry({
    movement,
    compact = false,
}: {
    movement: Movement;
    compact?: boolean;
}) {
    const catalog = useCatalog();
    const action = ACTIONS[movement.type];
    const category = findCategory(catalog, movement.wineCategory);
    const title = movement.wineVintage
        ? `${movement.wineName} ${movement.wineVintage}`
        : movement.wineName;
    const name = movement.user?.name ?? 'Quelqu’un';

    const place =
        movement.type === 'moved'
            ? movement.from && movement.to
                ? ` de ${movement.from} vers ${movement.to}`
                : movement.to
                  ? ` vers ${movement.to}`
                  : ''
            : movement.type === 'added' || movement.type === 'restocked'
              ? movement.to
                  ? ` dans ${movement.to}`
                  : ''
              : movement.from
                ? ` de ${movement.from}`
                : '';

    return (
        <div className="relative flex gap-3">
            <div className="relative shrink-0">
                <MemberAvatar
                    id={movement.user?.id ?? 0}
                    name={name}
                    size={compact ? 34 : 38}
                />
                <span
                    className="absolute -right-1 -bottom-1 flex size-[18px] items-center justify-center rounded-full ring-2 ring-card"
                    style={{ background: action.color }}
                >
                    <action.icon
                        className="size-2.5 text-white"
                        strokeWidth={3}
                    />
                </span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[14px] leading-snug">
                    <strong className="font-bold">{name}</strong> {action.verb}{' '}
                    {movement.quantity && movement.type !== 'updated' ? (
                        <strong className="font-bold tabular-nums">
                            {movement.quantity} ×{' '}
                        </strong>
                    ) : null}
                    <span aria-hidden>{category.emoji} </span>
                    {movement.wineId ? (
                        <Link
                            href={wines.show(movement.wineId)}
                            className="font-bold hover:underline"
                        >
                            {title}
                        </Link>
                    ) : (
                        <strong className="font-bold">{title}</strong>
                    )}
                    <span className="text-muted-foreground">{place}</span>
                    {movement.type === 'gifted' && movement.note && (
                        <span className="text-muted-foreground">
                            {' '}
                            à {movement.note}
                        </span>
                    )}
                </p>
                {movement.type === 'drunk' && movement.rating && (
                    <StarRating
                        value={movement.rating}
                        size="sm"
                        className="mt-1"
                    />
                )}
                {movement.note &&
                    (movement.type === 'drunk' ||
                        movement.type === 'discarded') && (
                        <p
                            className={cn(
                                'mt-1 text-[13px] text-muted-foreground',
                                movement.type === 'drunk' && 'italic',
                            )}
                        >
                            {movement.type === 'drunk'
                                ? `« ${movement.note} »`
                                : movement.note}
                        </p>
                    )}
                <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">
                    {timeAgo(movement.createdAt)}
                </p>
            </div>
        </div>
    );
}
