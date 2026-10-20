import { useRef } from 'react';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * Gemeinsame Bottom-Sheet-Animation (Review 20.10., K2): Slide 600→0 +
 * Backdrop-Fade waren dreifach kopiert (session-manage, swap-exercise,
 * exercise-actions-menu) — Timing-Tweaks und Guards drifteten prompt.
 *
 * Nutzung: `enter()` beim ersten onLayout (Routen-Sheets) bzw. in onShow
 * (RN-Modal — dort resettet jeder Aufruf) starten; `close(action)` animiert
 * raus und ruft die Aktion NACH der Animation auf dem JS-Thread.
 * Lint-Hinweis (react-hooks/immutability): enter/close mutieren Shared
 * Values und werden hier VOR den useAnimatedStyle-Lesern definiert — beim
 * Konsumieren nicht in useEffect aufrufen.
 */
export function useBottomSheetAnimation() {
    const slideValue = useSharedValue(600);
    const overlayValue = useSharedValue(0);
    const entered = useRef(false);

    function enter(opts?: { reset?: boolean }) {
        if (opts?.reset) {
            entered.current = false;
            slideValue.value = 600;
            overlayValue.value = 0;
        }
        if (entered.current) return;
        entered.current = true;
        overlayValue.value = withTiming(1, { duration: 250 });
        slideValue.value = withTiming(0, { duration: 300 });
    }

    function close(action: () => void) {
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(action);
        });
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    return { enter, close, sheetStyle, backdropStyle };
}
