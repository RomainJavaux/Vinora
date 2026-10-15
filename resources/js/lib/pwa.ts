import { useSyncExternalStore } from 'react';

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

/**
 * Register the service worker (production only) and capture the install
 * prompt so the banner can offer it later.
 */
export function initializePwa(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event as BeforeInstallPromptEvent;
        notify();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        notify();
    });

    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .catch(() => undefined);
        });
    }
}

export function useInstallPrompt(): BeforeInstallPromptEvent | null {
    return useSyncExternalStore(
        (callback) => {
            listeners.add(callback);

            return () => listeners.delete(callback);
        },
        () => deferredPrompt,
        () => null,
    );
}

export async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt) {
        return false;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();

    return choice.outcome === 'accepted';
}

export function isStandalone(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

export function isIos(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }

    return (
        /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.userAgent.includes('Macintosh') &&
            navigator.maxTouchPoints > 1)
    );
}

/** Ask the service worker to forget the pages kept for offline use. */
export function clearOfflineCache(): void {
    try {
        navigator.serviceWorker?.controller?.postMessage({ type: 'logout' });
    } catch {
        // No service worker.
    }
}

export function readFlag(key: string): boolean {
    try {
        return localStorage.getItem(key) === '1';
    } catch {
        return false;
    }
}

export function writeFlag(key: string): void {
    try {
        localStorage.setItem(key, '1');
    } catch {
        // Storage unavailable (private mode…).
    }
}
