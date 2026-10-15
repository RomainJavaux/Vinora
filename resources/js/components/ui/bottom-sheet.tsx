import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import {
    AnimatePresence,
    motion,
    useDragControls,
    type PanInfo,
} from 'motion/react';
import type { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    /** Illustration shown centred above the title. */
    hero?: ReactNode;
    children?: ReactNode;
    /** Sticky footer (actions). */
    footer?: ReactNode;
    hideTitle?: boolean;
    className?: string;
};

const spring = { type: 'spring', damping: 32, stiffness: 340, mass: 0.9 } as const;

/**
 * Mobile: a sheet stuck to the bottom of the screen that can be dragged
 * down to close (only from its header, so the content still scrolls).
 * Desktop: a centred card.
 */
export function BottomSheet({
    open,
    onOpenChange,
    title,
    description,
    hero,
    children,
    footer,
    hideTitle = false,
    className,
}: Props) {
    const isMobile = useIsMobile();
    const controls = useDragControls();

    const onDragEnd = (_: unknown, info: PanInfo) => {
        if (info.offset.y > 110 || info.velocity.y > 600) {
            onOpenChange(false);
        }
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <AnimatePresence>
                {open && (
                    <DialogPrimitive.Portal forceMount>
                        <DialogPrimitive.Overlay asChild forceMount>
                            <motion.div
                                className="fixed inset-0 z-50 bg-[rgb(30_12_16/0.45)] backdrop-blur-[6px]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            />
                        </DialogPrimitive.Overlay>

                        <DialogPrimitive.Content
                            asChild
                            forceMount
                            onOpenAutoFocus={
                                isMobile ? (event) => event.preventDefault() : undefined
                            }
                        >
                            {isMobile ? (
                                <motion.div
                                    className={cn(
                                        'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[30px] border border-b-0 border-glass-border bg-popover shadow-float outline-none',
                                        className,
                                    )}
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={spring}
                                    drag="y"
                                    dragListener={false}
                                    dragControls={controls}
                                    dragConstraints={{ top: 0, bottom: 0 }}
                                    dragElastic={{ top: 0.05, bottom: 0.9 }}
                                    onDragEnd={onDragEnd}
                                >
                                    <div
                                        className="shrink-0 cursor-grab touch-none px-5 pt-3 active:cursor-grabbing"
                                        onPointerDown={(event) => controls.start(event)}
                                    >
                                        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-foreground/15" />
                                        <SheetHeader
                                            title={title}
                                            description={description}
                                            hero={hero}
                                            hideTitle={hideTitle}
                                        />
                                    </div>
                                    <SheetBody footer={footer}>{children}</SheetBody>
                                </motion.div>
                            ) : (
                                <motion.div
                                    className={cn(
                                        'fixed top-1/2 left-1/2 z-50 flex max-h-[88dvh] w-[calc(100%-2rem)] max-w-[512px] flex-col rounded-[28px] border border-glass-border bg-popover shadow-float outline-none',
                                        className,
                                    )}
                                    style={{ x: '-50%', y: '-50%' }}
                                    initial={{ opacity: 0, scale: 0.94 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={spring}
                                >
                                    <div className="shrink-0 px-6 pt-6">
                                        <SheetHeader
                                            title={title}
                                            description={description}
                                            hero={hero}
                                            hideTitle={hideTitle}
                                        />
                                    </div>
                                    <DialogPrimitive.Close
                                        className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                        aria-label="Fermer"
                                    >
                                        <X className="size-5" />
                                    </DialogPrimitive.Close>
                                    <SheetBody footer={footer} desktop>
                                        {children}
                                    </SheetBody>
                                </motion.div>
                            )}
                        </DialogPrimitive.Content>
                    </DialogPrimitive.Portal>
                )}
            </AnimatePresence>
        </DialogPrimitive.Root>
    );
}

function SheetHeader({
    title,
    description,
    hero,
    hideTitle,
}: Pick<Props, 'title' | 'description' | 'hero' | 'hideTitle'>) {
    return (
        <div className={cn('text-center', !hideTitle && 'pb-1')}>
            {hero && <div className="mb-3 flex justify-center">{hero}</div>}
            <DialogPrimitive.Title
                className={cn(
                    'font-display text-xl font-extrabold',
                    hideTitle && 'sr-only',
                )}
            >
                {title}
            </DialogPrimitive.Title>
            {description ? (
                <DialogPrimitive.Description
                    className={cn(
                        'mt-1.5 text-[14px] text-muted-foreground',
                        hideTitle && 'sr-only',
                    )}
                >
                    {description}
                </DialogPrimitive.Description>
            ) : (
                <DialogPrimitive.Description className="sr-only">
                    {typeof title === 'string' ? title : 'Fenêtre'}
                </DialogPrimitive.Description>
            )}
        </div>
    );
}

function SheetBody({
    children,
    footer,
    desktop = false,
}: {
    children?: ReactNode;
    footer?: ReactNode;
    desktop?: boolean;
}) {
    return (
        <>
            <div
                className={cn(
                    'min-h-0 flex-1 overflow-y-auto overscroll-contain',
                    desktop ? 'px-6 pt-4 pb-6' : 'px-5 pt-3 pb-5',
                    !footer && !desktop && 'pb-safe',
                )}
            >
                {children}
            </div>
            {footer && (
                <div
                    className={cn(
                        'shrink-0 border-t border-hairline bg-popover/95',
                        desktop ? 'rounded-b-[28px] px-6 py-4' : 'pb-safe px-5 pt-3',
                    )}
                >
                    {footer}
                </div>
            )}
        </>
    );
}
