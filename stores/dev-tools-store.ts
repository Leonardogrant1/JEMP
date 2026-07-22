import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type DevToolsStore = {
    devButtonsVisible: boolean;
    setDevButtonsVisible: (value: boolean) => void;
};

export const useDevToolsStore = create<DevToolsStore>()(
    persist(
        (set) => ({
            devButtonsVisible: true,
            setDevButtonsVisible: (value) => set({ devButtonsVisible: value }),
        }),
        {
            name: 'dev-tools-store',
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
