import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startPlanGeneration } from '@/lib/start-plan-generation';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { useToastStore } from '@/stores/toast-store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

function OptionRow({ icon, label, description, theme, onPress }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description: string;
    theme: (typeof Colors)['light'];
    onPress: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.option,
                { backgroundColor: theme.background },
                pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
        >
            <View style={[styles.iconBox, { backgroundColor: `${GradientMid}18` }]}>
                <Ionicons name={icon} size={22} color={GradientMid} />
            </View>
            <View style={styles.optionText}>
                <JempText type="body-l" color={theme.text}>{label}</JempText>
                <JempText type="caption" color={theme.textMuted} style={styles.optionDesc}>
                    {description}
                </JempText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
        </Pressable>
    );
}

export default function NewPlanSheet() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const { openWithPlacement } = useSuperwallFunctions();

    const slideValue = useSharedValue(600);
    const overlayValue = useSharedValue(0);

    // Eintritts-Animation über onLayout statt useEffect — die Lint-Regel
    // react-hooks/immutability verbietet Shared-Value-Mutation im useEffect
    const entered = useRef(false);
    function handleSheetLayout() {
        if (entered.current) return;
        entered.current = true;
        overlayValue.value = withTiming(1, { duration: 250 });
        slideValue.value = withTiming(0, { duration: 300 });
    }

    function closeThen(action: () => void) {
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(action);
        });
    }

    function handleClose() {
        closeThen(() => router.back());
    }

    // Erst das Sheet schließen, dann Paywall-Gate — bleibt das Sheet offen,
    // würde ein abgebrochener Paywall-Flow eine unsichtbare Route hinterlassen
    function handleKeepSettings() {
        const errorMessage = t('ui.plan_generate_start_error');
        closeThen(() => {
            router.back();
            openWithPlacement('generate_plan', () => {
                startPlanGeneration().catch(() => {
                    useToastStore.getState().show(errorMessage);
                });
            });
        });
    }

    function handleEditSettings() {
        closeThen(() => {
            router.back();
            openWithPlacement('generate_plan', () => router.push('/generate-plan'));
        });
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={styles.backdropPressable} onPress={handleClose}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Reanimated.View
                        onLayout={handleSheetLayout}
                        style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}
                    >
                        <View style={[styles.content, { paddingBottom: insets.bottom + 12 }]}>
                            <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                            <View style={styles.textBlock}>
                                <JempText type="h2" color={theme.text}>
                                    {t('ui.plan_generate_confirm_title')}
                                </JempText>
                                <JempText type="body-l" color={theme.textMuted} style={styles.description}>
                                    {t('ui.plan_generate_confirm_body')}
                                </JempText>
                            </View>

                            <View style={styles.optionList}>
                                <OptionRow
                                    icon="sparkles"
                                    label={t('ui.new_plan_keep_settings')}
                                    description={t('ui.new_plan_keep_settings_desc')}
                                    theme={theme}
                                    onPress={handleKeepSettings}
                                />
                                <OptionRow
                                    icon="options-outline"
                                    label={t('ui.new_plan_edit_settings')}
                                    description={t('ui.new_plan_edit_settings_desc')}
                                    theme={theme}
                                    onPress={handleEditSettings}
                                />
                            </View>
                        </View>
                    </Reanimated.View>
                </Pressable>
            </Pressable>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    backdropPressable: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    content: {
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 18,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 4,
    },
    textBlock: {
        gap: 6,
    },
    description: {
        lineHeight: 22,
    },
    optionList: {
        gap: 10,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        borderRadius: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        flex: 1,
        gap: 2,
    },
    optionDesc: {
        lineHeight: 18,
    },
});
