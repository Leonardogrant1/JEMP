import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ProfileBannerStore = {
    /**
     * Last resolved banner URL per user id. `null` means "resolved: no banner
     * → default", a missing key means "never resolved" (don't show anything
     * until we know).
     */
    bannersByUser: Record<string, string | null>;
    setLastBannerUrl: (userId: string, url: string | null) => void;
};

/** Persists the resolved profile banner so remounts show the right image instantly. */
export const useProfileBannerStore = create<ProfileBannerStore>()(
    persist(
        (set) => ({
            bannersByUser: {},
            setLastBannerUrl: (userId, url) =>
                set((s) => ({ bannersByUser: { ...s.bannersByUser, [userId]: url } })),
        }),
        {
            name: 'profile-banner-store',
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
