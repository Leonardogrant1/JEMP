import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Reanimated, { FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

const SUB_MANAGEMENT_URL = Platform.select({
    ios: 'https://apps.apple.com/account/subscriptions',
    android: 'https://play.google.com/store/account/subscriptions?package=studio.northbyte.jemp',
    default: 'https://play.google.com/store/account/subscriptions',
});

const FEEDBACK_TEXT_MAX_LENGTH = 500;

const CANCEL_REASONS = [
    { key: 'profile.cancel_reason_dislike_plan', trackerVal: 'dislike_plan' },
    { key: 'profile.cancel_reason_too_expensive', trackerVal: 'too_expensive' },
    { key: 'profile.cancel_reason_injured_or_break', trackerVal: 'injured_or_break' },
    { key: 'profile.cancel_reason_found_another_app', trackerVal: 'found_another_app' },
    { key: 'profile.cancel_reason_just_looking', trackerVal: 'just_looking' },
    { key: 'profile.cancel_reason_technical_issues', trackerVal: 'technical_issues' },
    { key: 'profile.cancel_reason_other', trackerVal: 'other' },
];

const PLAN_REASONS = [
    { key: 'profile.plan_reason_not_intense_enough', trackerVal: 'not_intense_enough' },
    { key: 'profile.plan_reason_too_intense', trackerVal: 'too_intense' },
    { key: 'profile.plan_reason_wrong_exercises', trackerVal: 'wrong_exercises' },
    { key: 'profile.plan_reason_too_repetitive', trackerVal: 'too_repetitive' },
    { key: 'profile.plan_reason_doesnt_fit_schedule', trackerVal: 'doesnt_fit_schedule' },
    { key: 'profile.plan_reason_no_progress', trackerVal: 'no_progress' },
    { key: 'profile.plan_reason_other', trackerVal: 'other' },
];

type Step = 'details' | 'reasons' | 'plan_feedback' | 'free_text' | 'instructions';

export default function SubscriptionScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [step, setStep] = useState<Step>('details');
    const [reason, setReason] = useState<string | null>(null);
    const [subReason, setSubReason] = useState<string | null>(null);
    const [feedbackText, setFeedbackText] = useState('');

    const translateY = useSharedValue(600);
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
        translateY.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(goBack);
        });
    }

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

    async function openStore() {
        try {
            await Linking.openURL(SUB_MANAGEMENT_URL);
        } catch (err) {
            console.warn('Could not open subscription URL', err);
        }
        handleClose();
    }

    // Funnel-Einstieg: started vs. survey zeigt, wie viele im Flow abspringen
    function startCancelFlow() {
        trackerManager.track('subscription_cancel_started');
        setStep('reasons');
    }

    // Antworten nur sammeln — getrackt wird erst beim finalen „Abo verwalten",
    // damit nur Umfragen von Usern zählen, die wirklich zum Store durchgehen
    function selectReason(val: string) {
        setReason(val);
        setSubReason(null);
        setStep(val === 'dislike_plan' ? 'plan_feedback' : val === 'other' ? 'free_text' : 'instructions');
    }

    function selectPlanReason(val: string) {
        setSubReason(val);
        setStep(val === 'other' ? 'free_text' : 'instructions');
    }

    function submitFeedbackText() {
        setStep('instructions');
    }

    function handleFinalManage() {
        const text = feedbackText.trim();
        trackerManager.track('subscription_cancellation_survey', {
            reason,
            ...(subReason ? { sub_reason: subReason } : {}),
            ...(text.length > 0 ? { text } : {}),
        });
        openStore();
    }

    function renderOptionList(options: { key: string; trackerVal: string }[], onSelect: (val: string) => void) {
        return (
            <View style={styles.list}>
                {options.map((opt, index) => (
                    <View key={opt.trackerVal}>
                        {index > 0 && <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />}
                        <Pressable
                            style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.background }]}
                            onPress={() => onSelect(opt.trackerVal)}
                        >
                            <JempText type="body-l" color={theme.text} style={styles.rowText}>
                                {t(opt.key)}
                            </JempText>
                            <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                        </Pressable>
                    </View>
                ))}
            </View>
        );
    }

    const title = step === 'details' ? t('profile.subscription_modal_title')
        : step === 'reasons' ? t('profile.subscription_feedback_title')
            : step === 'plan_feedback' ? t('profile.plan_feedback_title')
                : step === 'free_text' ? t('profile.cancel_text_title')
                    : t('profile.subscription_cancel');

    const canSubmitText = feedbackText.trim().length > 0;

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <KeyboardAvoidingView behavior="padding" style={styles.avoidingView}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                <Reanimated.View
                    onLayout={handleSheetLayout}
                    layout={LinearTransition.duration(250)}
                    style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}
                >
                    <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                            <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                            <View style={styles.header}>
                                <JempText type="h2" color={theme.text}>{title}</JempText>
                                <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                    <Ionicons name="close" size={22} color={theme.textMuted} />
                                </TouchableOpacity>
                            </View>

                            {step === 'details' && (
                                <Reanimated.View entering={FadeIn.duration(200)} style={styles.stepBody}>
                                    <JempText type="body-sm" color={theme.textMuted} style={styles.bodyText}>
                                        {t('profile.subscription_modal_active')}
                                    </JempText>
                                    <View style={styles.list}>
                                        <Pressable
                                            style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.background }]}
                                            onPress={openStore}
                                        >
                                            <JempText type="body-l" color={theme.text} style={styles.rowText}>
                                                {t('profile.subscription_manage')}
                                            </JempText>
                                            <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                                        </Pressable>
                                        <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                                        <Pressable
                                            style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.background }]}
                                            onPress={startCancelFlow}
                                        >
                                            <JempText type="body-l" color="#ef4444" style={styles.rowText}>
                                                {t('profile.subscription_cancel')}
                                            </JempText>
                                            <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                                        </Pressable>
                                    </View>
                                </Reanimated.View>
                            )}

                            {step === 'reasons' && (
                                <Reanimated.View entering={FadeIn.duration(200)} style={styles.stepBody}>
                                    <JempText type="body-sm" color={theme.textMuted} style={styles.bodyText}>
                                        {t('profile.subscription_feedback_subtitle')}
                                    </JempText>
                                    {renderOptionList(CANCEL_REASONS, selectReason)}
                                </Reanimated.View>
                            )}

                            {step === 'plan_feedback' && (
                                <Reanimated.View entering={FadeIn.duration(200)} style={styles.stepBody}>
                                    <JempText type="body-sm" color={theme.textMuted} style={styles.bodyText}>
                                        {t('profile.plan_feedback_subtitle')}
                                    </JempText>
                                    {renderOptionList(PLAN_REASONS, selectPlanReason)}
                                </Reanimated.View>
                            )}

                            {step === 'free_text' && (
                                <Reanimated.View entering={FadeIn.duration(200)} style={styles.stepBody}>
                                    <JempText type="body-sm" color={theme.textMuted} style={styles.bodyText}>
                                        {t('profile.cancel_text_subtitle')}
                                    </JempText>
                                    <JempInput
                                        variant="outlined"
                                        value={feedbackText}
                                        onChangeText={setFeedbackText}
                                        placeholder={t('profile.cancel_text_placeholder')}
                                        multiline
                                        maxLength={FEEDBACK_TEXT_MAX_LENGTH}
                                        style={styles.textInput}
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={[styles.primaryButton, !canSubmitText && styles.primaryButtonDisabled]}
                                        onPress={submitFeedbackText}
                                        disabled={!canSubmitText}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={[Cyan[500], Electric[500]]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <JempText type="body-l" color="#fff">{t('profile.cancel_text_submit')}</JempText>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.skipButton} onPress={() => setStep('instructions')}>
                                        <JempText type="body-sm" color={theme.textMuted}>
                                            {t('profile.cancel_text_skip')}
                                        </JempText>
                                    </TouchableOpacity>
                                </Reanimated.View>
                            )}

                            {step === 'instructions' && (
                                <Reanimated.View entering={FadeIn.duration(200)} style={styles.stepBody}>
                                    <JempText type="body-sm" color={theme.textMuted} style={styles.bodyText}>
                                        {t('profile.subscription_cancel_instructions')}
                                    </JempText>
                                    <TouchableOpacity style={styles.primaryButton} onPress={handleFinalManage} activeOpacity={0.8}>
                                        <LinearGradient
                                            colors={[Cyan[500], Electric[500]]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <JempText type="body-l" color="#fff">{t('profile.subscription_manage')}</JempText>
                                    </TouchableOpacity>
                                </Reanimated.View>
                            )}
                        </View>
                    </ScrollView>
                </Reanimated.View>
            </KeyboardAvoidingView>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    avoidingView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '100%',
    },
    content: {
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 16,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bodyText: {
        lineHeight: 20,
    },
    stepBody: {
        gap: 16,
    },
    list: {
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderRadius: 12,
    },
    rowText: {
        flex: 1,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 4,
    },
    textInput: {
        minHeight: 110,
        textAlignVertical: 'top',
    },
    primaryButton: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
        width: '100%',
        overflow: 'hidden',
    },
    primaryButtonDisabled: {
        opacity: 0.4,
    },
    skipButton: {
        alignSelf: 'center',
        paddingVertical: 4,
    },
});
