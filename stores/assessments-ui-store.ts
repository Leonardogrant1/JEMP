import { create } from 'zustand';

// Survives remounts of the assessments tab: keeps the selected category
// active after completing an assessment, and remembers the last seen
// pending-per-category counts to detect "category completed" transitions.
type AssessmentsUiStore = {
    selectedCategory: { slug: string; index: number } | null;
    setSelectedCategory: (value: { slug: string; index: number }) => void;
    pendingSnapshot: Record<string, number> | null;
    setPendingSnapshot: (value: Record<string, number>) => void;
    celebrateCategory: string | null;
    setCelebrateCategory: (value: string | null) => void;
};

export const useAssessmentsUiStore = create<AssessmentsUiStore>((set) => ({
    selectedCategory: null,
    setSelectedCategory: (value) => set({ selectedCategory: value }),
    pendingSnapshot: null,
    setPendingSnapshot: (value) => set({ pendingSnapshot: value }),
    celebrateCategory: null,
    setCelebrateCategory: (value) => set({ celebrateCategory: value }),
}));
