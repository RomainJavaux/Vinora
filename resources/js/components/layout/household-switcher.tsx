import { Link, router, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown, Plus, Settings2 } from 'lucide-react';
import { HouseholdBadge } from '@/components/member-avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { onboarding } from '@/routes';
import householdRoutes from '@/routes/household';
import households from '@/routes/households';

export function HouseholdSwitcher({ compact = false }: { compact?: boolean }) {
    const { household, households: list } = usePage().props;

    if (!household) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    'group flex min-w-0 items-center gap-3 rounded-2xl text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/25',
                    compact
                        ? '-ml-1 max-w-[70vw] p-1 pr-2 hover:bg-accent/70'
                        : 'w-full border border-hairline bg-card/70 p-2.5 shadow-soft hover:bg-card',
                )}
            >
                <HouseholdBadge
                    emoji={household.emoji}
                    color={household.color}
                    size={compact ? 36 : 40}
                />
                <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                        Lieu
                    </span>
                    <span className="block truncate font-display text-[15px] font-bold">
                        {household.name}
                    </span>
                </span>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel>Mes lieux</DropdownMenuLabel>
                {list.map((item) => (
                    <DropdownMenuItem
                        key={item.id}
                        onSelect={() => {
                            if (item.id !== household.id) {
                                router.put(households.switch(item.id).url);
                            }
                        }}
                    >
                        <HouseholdBadge
                            emoji={item.emoji}
                            color={item.color}
                            size={28}
                        />
                        <span className="min-w-0 flex-1 truncate">
                            {item.name}
                        </span>
                        {item.id === household.id && (
                            <Check className="size-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={householdRoutes.show()}>
                        <Settings2 />
                        Gérer « {household.name} »
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={onboarding({ query: { new: 1 } })}>
                        <Plus />
                        Créer un autre lieu
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
