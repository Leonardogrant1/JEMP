import { UnitSystem } from '@/helpers/units';
import { useCurrentUser } from '@/providers/current-user-provider';

/** The user's display unit preference. Storage stays metric — display only. */
export function useUnitSystem(): UnitSystem {
    const { profile } = useCurrentUser();
    return profile?.unit_system === 'imperial' ? 'imperial' : 'metric';
}
