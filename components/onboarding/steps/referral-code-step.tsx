import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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

    const [code, setCode] = useState('');
    const [status, setStatus] = useState<SubmitStatus>('idle');

    const canSubmit = code.trim().length > 0 && status === 'idle';

    function handleCodeChange(value: string) {
        setCode(value.toUpperCase());
    }

    async function handleSubmit() {
        if (!canSubmit) return;
        setStatus('loading');
        try {
            const revenueCatUserId = await Purchases.getAppUserID();
            const response = await fetch('https://www.northbyte.studio/api/affiliate/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appSlug: 'jemp',
                    affiliateCode: code.trim(),
                    appUserId: session?.user?.id ?? '',
                    revenueCatUserId,
                }),
            });

            if (response.status === 201) {
                setStore({ referral_code: code.trim() });
                if (session?.user?.id) {
                    await supabase
                        .from('user_profiles')
                        .update({ referral_code: code.trim() })
                        .eq('id', session.user.id);
                }
                setStatus('success');
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
        <KeyboardAwareScrollView
            style={styles.container}
            contentContainerStyle={styles.inner}
            keyboardShouldPersistTaps="handled"
        >
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.headline}>
                    {t('onboarding.referral_title')}
                </JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.referral_subtitle')}
                </JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()} style={styles.inputRow}>
                <JempInput
                    value={code}
                    onChangeText={handleCodeChange}
                    placeholder={t('onboarding.referral_placeholder')}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    style={styles.input}
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
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 32,
    },
    headline: {
        marginBottom: 10,
    },
    subtitle: {
        marginBottom: 40,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    input: {
        flex: 1,
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
