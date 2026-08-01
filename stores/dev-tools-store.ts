import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type DevToolsStore = {
    devButtonsVisible: boolean;
    setDevButtonsVisible: (value: boolean) => void;
    /** DEV: render progress charts as if no history exists, to preview empty states */
    hideSparklineData: boolean;
    toggleHideSparklineData: () => void;
};

export const useDevToolsStore = create<DevToolsStore>()(
    persist(
        (set) => ({
            devButtonsVisible: true,
            setDevButtonsVisible: (value) => set({ devButtonsVisible: value }),
            hideSparklineData: false,
            toggleHideSparklineData: () => set((s) => ({ hideSparklineData: !s.hideSparklineData })),
        }),
        {
            name: 'dev-tools-store',
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
