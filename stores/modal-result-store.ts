import { create } from 'zustand';

type ModalResultStore = {
    assessmentConfirmed: boolean;
    setAssessmentConfirmed: (value: boolean) => void;
    planJustGenerated: boolean;
    setPlanJustGenerated: (value: boolean) => void;
    // Ergebnis der Video-Sprungmessung (/jump-measure) — Assessment-Screen
    // liest und cleart es beim Fokus
    measuredJumpCm: number | null;
    setMeasuredJumpCm: (value: number | null) => void;
};

export const useModalResultStore = create<ModalResultStore>((set) => ({
    assessmentConfirmed: false,
    setAssessmentConfirmed: (value) => set({ assessmentConfirmed: value }),
    planJustGenerated: false,
    setPlanJustGenerated: (value) => set({ planJustGenerated: value }),
    measuredJumpCm: null,
    setMeasuredJumpCm: (value) => set({ measuredJumpCm: value }),
}));
