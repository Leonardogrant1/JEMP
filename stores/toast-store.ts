import { create } from 'zustand';

type ToastState = {
    message: string | null;
    // Nonce, damit derselbe Text hintereinander erneut animiert/getimed wird
    nonce: number;
    show: (message: string) => void;
    hide: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
    message: null,
    nonce: 0,
    show: (message) => set((s) => ({ message, nonce: s.nonce + 1 })),
    hide: () => set({ message: null }),
}));
