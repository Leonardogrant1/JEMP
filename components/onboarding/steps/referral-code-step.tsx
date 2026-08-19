import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { StepScaffold } from '@/components/onboarding/step-scaffold';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { getBuildEnvironment } from '@/utils/build-environment';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Keyboard,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Purchases from 'react-native-purchases';
import Animated, { FadeInDown } from 'react-native-reanimated';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error_not_found' | 'error_network';

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

export function ReferralCodeStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { session } = useAuth();
    const setStore = useOnboardingStore((s) => s.set);
    const existingCode = useOnboardingStore((s) => s.referral_code);
    const { nextStep } = useOnboardingControl();

    const alreadyRedeemed = !!existingCode;
    const [code, setCode] = useState(existingCode ?? '');
    const [status, setStatus] = useState<SubmitStatus>(alreadyRedeemed ? 'success' : 'idle');

    const canSubmit = code.trim().length > 0 && status === 'idle' && !alreadyRedeemed;

    function handleCodeChange(value: string) {
        setCode(value.toUpperCase());
        if (status === 'error_not_found' || status === 'error_network') {
            setStatus('idle');
        }
    }

    async function handleSubmit() {
        if (!canSubmit) return;
        if (!session?.user?.id) { setStatus('error_network'); return; }
        setStatus('loading');
        try {
            const [revenueCatUserId, environment] = await Promise.all([
                Purchases.getAppUserID(),
                getBuildEnvironment(),
            ]);
            const response = await fetch('https://www.northbyte.studio/api/affiliate/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appSlug: 'jemp',
                    affiliateCode: code.trim(),
                    appUserId: session?.user?.id ?? '',
                    revenueCatUserId,
                    environment,
                }),
            });

            if (response.status === 201) {
                setStore({ referral_code: code.trim() });
                if (session?.user?.id) {
                    const { error: dbError } = await supabase
                        .from('user_profiles')
                        .update({ referral_code: code.trim() })
                        .eq('id', session.user.id);
                    if (dbError) console.error('[ReferralCodeStep] Failed to save referral_code:', dbError);
                }
                setStatus('success');
                Keyboard.dismiss();
                setTimeout(() => nextStep(), 600);
            } else if (response.status === 404) {
                setStatus('error_not_found');
            } else {
                setStatus('error_network');
            }
        } catch {
            setStatus('error_network');
        }
    }

    const showFeedback = status === 'success' || status === 'error_not_found' || status === 'error_network';
    const feedbackColor = status === 'success' ? theme.success : '#EF5350';
    const feedbackKey =
        status === 'success'
            ? 'onboarding.referral_success'
            : status === 'error_not_found'
                ? 'onboarding.referral_error_not_found'
                : 'onboarding.referral_error_network';

    return (
        // padding-Behavior schrumpft den Step um die Keyboard-Höhe — der
        // zentrierte Content slidet dadurch weich nach oben
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
            <StepScaffold title={t('onboarding.referral_title')} subtitle={t('onboarding.referral_subtitle')} centerContent>
            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()} style={styles.inputRow}>
                <JempInput
                    value={code}
                    onChangeText={handleCodeChange}
                    placeholder={t('onboarding.referral_placeholder')}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    editable={!alreadyRedeemed}
                    style={[styles.input, alreadyRedeemed && styles.inputLocked]}
                />
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    style={styles.submitWrapper}
                >
                    <LinearGradient
                        colors={GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.submitGradient, !canSubmit && styles.submitDisabled]}
                    >
                        {status === 'loading' ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <JempText type="body-sm" color="white">
                                {t('onboarding.referral_submit')}
                            </JempText>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            {showFeedback && (
                <Animated.View entering={FadeInDown.duration(300).springify()}>
                    <JempText type="body-sm" color={feedbackColor} style={styles.feedback}>
                        {t(feedbackKey as any)}
                    </JempText>
                </Animated.View>
            )}
            </StepScaffold>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    input: {
        flex: 1,
    },
    inputLocked: {
        opacity: 0.5,
    },
    submitWrapper: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    submitGradient: {
        paddingVertical: 18,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 90,
    },
    submitDisabled: {
        opacity: 0.35,
    },
    feedback: {
        marginTop: 12,
        textAlign: 'center',
    },
});
