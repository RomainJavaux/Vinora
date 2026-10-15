import type { Auth } from '@/types/auth';
import type {
    Catalog,
    CurrentHousehold,
    HouseholdSummary,
} from '@/types/models';
import type { FlashToast } from '@/types/ui';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            household: CurrentHousehold | null;
            households: HouseholdSummary[];
            catalog: Catalog;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
        flashDataType: {
            toast?: FlashToast;
            celebrate?: boolean;
            invitation?: {
                id: number;
                url: string;
                email: string | null;
                emailed: boolean;
            };
        };
    }
}
