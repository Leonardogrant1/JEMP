import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type DevToolsStore = {
    devButtonsVisible: boolean;
    setDevButtonsVisible: (value: boolean) => void;
    /** DEV: render progress charts as if no history exists, to preview empty states */
    hideSparklineData: boolean;
    toggleHideSparklineData: () => void;
    /** DEV: force the empty-plan state on plan.tsx to preview/design it */
    forcePlanEmpty: boolean;
    toggleForcePlanEmpty: () => void;
    /** DEV: when false, admin/affiliate users see the paywall instead of bypassing it */
    bypassPaywall: boolean;
    toggleBypassPaywall: () => void;
};

export const useDevToolsStore = create<DevToolsStore>()(
    persist(
        (set) => ({
            devButtonsVisible: true,
            setDevButtonsVisible: (value) => set({ devButtonsVisible: value }),
            hideSparklineData: false,
            toggleHideSparklineData: () => set((s) => ({ hideSparklineData: !s.hideSparklineData })),
            forcePlanEmpty: false,
            toggleForcePlanEmpty: () => set((s) => ({ forcePlanEmpty: !s.forcePlanEmpty })),
            bypassPaywall: true,
            toggleBypassPaywall: () => set((s) => ({ bypassPaywall: !s.bypassPaywall })),
        }),
        {
            name: 'dev-tools-store',
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
