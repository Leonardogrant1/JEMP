import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { StepScaffold } from '@/components/onboarding/step-scaffold';
import { SelectableRow } from '@/components/ui/selectable-row';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Kanäle mit Marken-Icons; labelKey nur wo übersetzt werden muss
const SOURCES: { value: string; icon: keyof typeof Ionicons.glyphMap; label?: string; labelKey?: string }[] = [
    { value: 'tiktok', icon: 'logo-tiktok', label: 'TikTok' },
    { value: 'instagram', icon: 'logo-instagram', label: 'Instagram' },
    { value: 'youtube', icon: 'logo-youtube', label: 'YouTube' },
    Platform.OS === 'android'
        ? { value: 'play_store', icon: 'logo-google-playstore', label: 'Play Store' }
        : { value: 'app_store', icon: 'logo-apple-appstore', label: 'App Store' },
    { value: 'friends', icon: 'people-outline', labelKey: 'onboarding.attribution_friends' },
    { value: 'x', icon: 'logo-x', label: 'X' },
];

export function AttributionStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedSource = useOnboardingStore((s) => s.attribution_source);
    const setStore = useOnboardingStore((s) => s.set);
    const [selected, setSelected] = useState<string | null>(storedSource);
    useEffect(() => {
        if (storedSource) setCanContinue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function select(value: string) {
        setSelected(value);
        setStore({ attribution_source: value });
        setCanContinue(true);
        // $set schreibt die Quelle zusätzlich als PostHog-Person-Property —
        // bei mehrfachem Umwählen zählt so automatisch die letzte Auswahl
        trackerManager.track('onboarding_attribution_selected', {
            source: value,
            $set: { attribution_source: value },
        });
    }

    return (
        <StepScaffold title={t('onboarding.attribution_title')} subtitle={t('onboarding.attribution_subtitle')} centerContent>
            <View style={styles.options}>
                {SOURCES.map((source, i) => (
                    <Animated.View
                        key={source.value}
                        entering={FadeInDown.delay(Math.min(360 + i * 80, 760)).duration(500).springify()}
                    >
                        <SelectableRow
                            label={source.label ?? t(source.labelKey as any)}
                            icon={source.icon}
                            selected={selected === source.value}
                            onPress={() => select(source.value)}
                        />
                    </Animated.View>
                ))}
            </View>
        </StepScaffold>
    );
}

const styles = StyleSheet.create({
    options: {
        gap: 10,
    },
});
