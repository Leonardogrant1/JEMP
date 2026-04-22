import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type TutorialStore = {
    hasSeenTutorial: boolean;
    setHasSeenTutorial: (value: boolean) => void;
};

export const useTutorialStore = create<TutorialStore>()(
    persist(
        (set) => ({
            hasSeenTutorial: false,
            setHasSeenTutorial: (value) => set({ hasSeenTutorial: value }),
        }),
        {
            name: 'tutorial-store',
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
