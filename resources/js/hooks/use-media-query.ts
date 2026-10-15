import { useSyncExternalStore } from 'react';

function subscribeTo(query: string) {
    return (callback: () => void) => {
        const list = window.matchMedia(query);
        list.addEventListener('change', callback);

        return () => list.removeEventListener('change', callback);
    };
}

export function useMediaQuery(query: string, serverValue = false): boolean {
    return useSyncExternalStore(
        subscribeTo(query),
        () => window.matchMedia(query).matches,
        () => serverValue,
    );
}

/** Below 768 px. */
export function useIsMobile(): boolean {
    return useMediaQuery('(max-width: 767px)');
}

/** From 1024 px (the sidebar appears). */
export function useIsDesktop(): boolean {
    return useMediaQuery('(min-width: 1024px)');
}
