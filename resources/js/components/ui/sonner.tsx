import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useAppearance } from '@/hooks/use-appearance';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { useIsMobile } from '@/hooks/use-media-query';

function Toaster({ ...props }: ToasterProps) {
    const { resolvedAppearance } = useAppearance();
    const isMobile = useIsMobile();

    useFlashToast();

    return (
        <Sonner
            theme={resolvedAppearance}
            className="toaster group"
            position={isMobile ? 'top-center' : 'bottom-right'}
            offset={isMobile ? { top: 'calc(env(safe-area-inset-top) + 12px)' } : 24}
            toastOptions={{
                classNames: {
                    toast: 'glass-strong !rounded-2xl !border-glass-border !shadow-float !font-sans !text-[14px] !font-semibold !text-foreground',
                    description: '!text-muted-foreground',
                },
            }}
            {...props}
        />
    );
}

export { Toaster };
