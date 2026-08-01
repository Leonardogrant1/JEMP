import { JempText } from '@/components/jemp-text';
import { Colors, Cyan } from '@/constants/theme';
import { UnitSystem } from '@/helpers/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

const OPTIONS: { system: UnitSystem; labelKey: string; hint: string }[] = [
    { system: 'metric', labelKey: 'ui.unit_metric', hint: 'kg · cm' },
    { system: 'imperial', labelKey: 'ui.unit_imperial', hint: 'lbs · ft' },
];

export default function UnitsScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { profile, refreshProfile } = useCurrentUser();
    const current: UnitSystem = profile?.unit_system === 'imperial' ? 'imperial' : 'metric';

    const translateY = useSharedValue(400);
    const overlayOpacity = useSharedValue(0);

    const entered = useRef(false);
    function handleSheetLayout() {
        if (entered.current) return;
        entered.current = true;
        overlayOpacity.value = withTiming(1, { duration: 250 });
        translateY.value = withTiming(0, { duration: 300 });
    }

    function goBack() {
        router.back();
    }

    function handleClose() {
        overlayOpacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(400, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(goBack);
        });
    }

    async function handleSelect(system: UnitSystem) {
        if (profile && system !== current) {
            await supabase.from('user_profiles').update({ unit_system: system }).eq('id', profile.id);
            await refreshProfile();
        }
        handleClose();
    }

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={styles.backdropPressable} onPress={handleClose}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Reanimated.View
                        onLayout={handleSheetLayout}
                        style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle, { paddingBottom: insets.bottom + 12 }]}
                    >
                        <View style={styles.header}>
                            <JempText type="h2">{t('ui.unit_system')}</JempText>
                            <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={8}>
                                <Ionicons name="close" size={20} color={theme.background} />
                            </Pressable>
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                        <View style={styles.list}>
                            {OPTIONS.map(opt => {
                                const active = current === opt.system;
                                return (
                                    <Pressable
                                        key={opt.system}
                                        style={({ pressed }) => [
                                            styles.row,
                                            { backgroundColor: active ? theme.primarySubtle : theme.background },
                                            pressed && { opacity: 0.7 },
                                        ]}
                                        onPress={() => handleSelect(opt.system)}
                                    >
                                        <View style={styles.rowText}>
                                            <JempText type="body-l" color={theme.text}>{t(opt.labelKey)}</JempText>
                                            <JempText type="caption" color={theme.textMuted}>{opt.hint}</JempText>
                                        </View>
                                        {active && <Ionicons name="checkmark" size={20} color={Cyan[400]} />}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Reanimated.View>
                </Pressable>
            </Pressable>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    backdropPressable: { flex: 1, justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    header: { alignItems: 'center', justifyContent: 'center', paddingVertical: 22, position: 'relative' },
    closeButton: { position: 'absolute', right: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
    divider: { height: 1 },
    list: { padding: 16, gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16 },
    rowText: { flex: 1, gap: 2 },
});
