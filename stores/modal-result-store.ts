import { create } from 'zustand';

type ModalResultStore = {
    assessmentConfirmed: boolean;
    setAssessmentConfirmed: (value: boolean) => void;
    planJustGenerated: boolean;
    setPlanJustGenerated: (value: boolean) => void;
};

export const useModalResultStore = create<ModalResultStore>((set) => ({
    assessmentConfirmed: false,
    setAssessmentConfirmed: (value) => set({ assessmentConfirmed: value }),
    planJustGenerated: false,
    setPlanJustGenerated: (value) => set({ planJustGenerated: value }),
}));
