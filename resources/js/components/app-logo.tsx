import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';

export default function AppLogo({
    className,
    light = false,
    size = 'md',
}: {
    className?: string;
    light?: boolean;
    size?: 'sm' | 'md' | 'lg';
}) {
    const icon = { sm: 'size-8', md: 'size-9', lg: 'size-11' }[size];
    const text = { sm: 'text-xl', md: 'text-[22px]', lg: 'text-[26px]' }[size];

    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            <AppLogoIcon
                className={cn(
                    icon,
                    'shrink-0 drop-shadow-[0_6px_14px_rgb(159_18_57/0.35)]',
                )}
            />
            <span
                className={cn(
                    'font-display font-extrabold tracking-tight',
                    text,
                    light ? 'text-white' : 'text-foreground',
                )}
            >
                Vinora
            </span>
        </span>
    );
}
