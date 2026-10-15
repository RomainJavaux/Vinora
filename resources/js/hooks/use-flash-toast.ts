import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { celebrate } from '@/lib/celebrate';

/**
 * Listen to the flash data sent by the server: toasts and celebrations.
 */
export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = event.detail.flash;

            if (flash.toast) {
                toast[flash.toast.type](flash.toast.message);
            }

            if (flash.celebrate) {
                celebrate();
            }
        });
    }, []);
}
