import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    TextInput,
    TextInputKeyPressEventData,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OTP_LENGTH = 6;

export default function MagicLinkScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { sendMagicLink } = useAuth();
    const { t } = useTranslation();

    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [verifying, setVerifying] = useState(false);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    async function handleSend() {
        if (!email.trim()) return;
        setLoading(true);
        setError(null);
        try {
            await sendMagicLink(email.trim().toLowerCase());
            setSent(true);
        } catch {
            setError(t('magic_link.error_generic'));
        } finally {
            setLoading(false);
        }
    }

    async function handleResend() {
        setLoading(true);
        setError(null);
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        try {
            await sendMagicLink(email.trim().toLowerCase());
        } catch {
            setError(t('magic_link.error_generic'));
        } finally {
            setLoading(false);
        }
    }

    async function verifyOtp(code: string) {
        setVerifying(true);
        setError(null);
        const { error } = await supabase.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token: code,
            type: 'email',
        });
        if (error) {
            setError(t('magic_link.error_invalid_code'));
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        }
        // On success the onAuthStateChange in AuthProvider picks up the session automatically
        setVerifying(false);
    }

    function handleOtpChange(value: string, index: number) {
        const digit = value.replace(/[^0-9]/g, '').slice(-1);
        const next = [...otp];
        next[index] = digit;
        setOtp(next);
        setError(null);

        if (digit && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        if (next.every(d => d !== '')) {
            verifyOtp(next.join(''));
        }
    }

    function handleOtpKeyPress(e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
            <Pressable style={styles.back} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>

            <View style={styles.content}>
                {!sent ? (
                    <>
                        <JempText type="h1" style={styles.title}>{t('magic_link.email_title')}</JempText>
                        <JempText type="body-sm" color={theme.textMuted} style={styles.subtitle}>
                            {t('magic_link.email_subtitle')}
                        </JempText>

                        <TextInput
                            style={[styles.input, {
                                backgroundColor: theme.surface,
                                borderColor: theme.borderStrong,
                                color: theme.text,
                            }]}
                            placeholder={t('magic_link.email_placeholder')}
                            placeholderTextColor={theme.textPlaceholder}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            value={email}
                            onChangeText={setEmail}
                            onSubmitEditing={handleSend}
                            returnKeyType="send"
                        />

                        {error && (
                            <JempText type="caption" color="#ef4444" style={styles.error}>
                                {error}
                            </JempText>
                        )}
                    </>
                ) : (
                    <>
                        <JempText type="h1" style={styles.title}>{t('magic_link.sent_title')}</JempText>
                        <JempText type="body-sm" color={theme.textMuted} style={styles.subtitle}>
                            {t('magic_link.sent_subtitle_a')}
                            <JempText type="body-sm" gradient>{email}</JempText>
                            {t('magic_link.sent_subtitle_b')}
                        </JempText>

                        <JempText type="caption" color={theme.textMuted} style={styles.otpLabel}>
                            {t('magic_link.otp_label')}
                        </JempText>

                        <View style={styles.otpRow}>
                            {otp.map((digit, i) => (
                                <TextInput
                                    key={i}
                                    ref={ref => { inputRefs.current[i] = ref; }}
                                    style={[styles.otpBox, {
                                        backgroundColor: theme.surface,
                                        borderColor: digit ? theme.text : theme.borderStrong,
                                        color: theme.text,
                                    }]}
                                    value={digit}
                                    onChangeText={v => handleOtpChange(v, i)}
                                    onKeyPress={e => handleOtpKeyPress(e, i)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                    editable={!verifying}
                                />
                            ))}
                        </View>

                        {verifying && (
                            <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />
                        )}

                        {error && (
                            <JempText type="caption" color="#ef4444" style={[styles.error, { marginTop: 12 }]}>
                                {error}
                            </JempText>
                        )}
                    </>
                )}
            </View>

            <View style={styles.footer}>
                <Pressable
                    onPress={sent ? () => Linking.openURL('mailto:') : handleSend}
                    disabled={loading || verifying || (!sent && !email.trim())}
                    style={{ opacity: loading || verifying || (!sent && !email.trim()) ? 0.5 : 1 }}
                >
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientBtn}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <JempText type="button" color="#fff">
                                {sent ? t('magic_link.btn_open_email') : t('magic_link.btn_send')}
                            </JempText>
                        )}
                    </LinearGradient>
                </Pressable>

                {sent && (
                    <Pressable onPress={handleResend} disabled={loading || verifying} style={styles.resendRow}>
                        <JempText type="caption" color={theme.textMuted}>
                            {t('magic_link.resend_prefix')}
                            <JempText type="caption" color={theme.text} style={{ fontFamily: Fonts.satoshiBold }}>
                                {t('magic_link.resend_link')}
                            </JempText>
                        </JempText>
                    </Pressable>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    back: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignSelf: 'flex-start',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    title: {
        marginBottom: 8,
    },
    subtitle: {
        marginBottom: 32,
        lineHeight: 22,
    },
    input: {
        height: 56,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 15,
        fontFamily: Fonts.satoshiRegular,
    },
    error: {
        marginTop: 8,
    },
    otpLabel: {
        marginBottom: 16,
    },
    otpRow: {
        flexDirection: 'row',
        gap: 10,
    },
    otpBox: {
        flex: 1,
        height: 56,
        borderRadius: 12,
        borderWidth: 1.5,
        textAlign: 'center',
        fontSize: 22,
        fontFamily: Fonts.satoshiBold,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 12,
    },
    gradientBtn: {
        height: 56,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resendRow: {
        alignItems: 'center',
        paddingTop: 16,
    },
});
