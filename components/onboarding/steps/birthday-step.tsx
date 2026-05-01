import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { JempInput } from '@/components/ui/jemp-input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

function isValidDate(day: number, month: number, year: number): boolean {
    if (year < 1900 || year > new Date().getFullYear()) return false;
    const date = new Date(year, month - 1, day);
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

function isAtLeast13(day: number, month: number, year: number): boolean {
    const birth = new Date(year, month - 1, day);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 13);
    return birth <= cutoff;
}

export function BirthdayStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedBirthDate = useOnboardingStore((s) => s.birth_date);
    const setStore = useOnboardingStore((s) => s.set);
    const [day, setDay] = useState(() => storedBirthDate ? String(parseInt(storedBirthDate.split('-')[2], 10)) : '');
    const [month, setMonth] = useState(() => storedBirthDate ? String(parseInt(storedBirthDate.split('-')[1], 10)) : '');
    const [year, setYear] = useState(() => storedBirthDate ? storedBirthDate.split('-')[0] : '');
    const monthRef = useRef<TextInput>(null);
    const yearRef = useRef<TextInput>(null);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        validate(day, month, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function validate(d: string, m: string, y: string) {
        const dd = parseInt(d, 10);
        const mm = parseInt(m, 10);
        const yy = parseInt(y, 10);
        if (y.length < 4) { setCanContinue(false); return; }
        if (!isValidDate(dd, mm, yy) || !isAtLeast13(dd, mm, yy)) {
            setCanContinue(false);
            return;
        }
        const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        setStore({ birth_date: iso });
        setCanContinue(true);
    }

    function handleDay(val: string) {
        const cleaned = val.replace(/\D/g, '').slice(0, 2);
        setDay(cleaned);
        if (cleaned.length === 2) monthRef.current?.focus();
        validate(cleaned, month, year);
    }

    function handleMonth(val: string) {
        const cleaned = val.replace(/\D/g, '').slice(0, 2);
        setMonth(cleaned);
        if (cleaned.length === 2) yearRef.current?.focus();
        validate(day, cleaned, year);
    }

    function handleYear(val: string) {
        const cleaned = val.replace(/\D/g, '').slice(0, 4);
        setYear(cleaned);
        validate(day, month, cleaned);
    }

    return (
        <Pressable style={styles.container} onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
                <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                    <JempText type="h1" style={styles.headline}>{t('onboarding.birthday_title')}</JempText>
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                    <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                        {t('onboarding.birthday_subtitle')}
                    </JempText>
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(360).duration(500).springify()} style={styles.row}>
                    <View style={styles.fieldWrap}>
                        <JempText type="caption" color={theme.textMuted} style={styles.label}>{t('onboarding.birthday_label_day')}</JempText>
                        <JempInput
                            value={day}
                            onChangeText={handleDay}
                            placeholder={t('onboarding.birthday_placeholder_day')}
                            keyboardType="number-pad"
                            maxLength={2}
                            autoFocus
                            textAlign="center"
                            style={styles.input}
                        />
                    </View>
                    <View style={styles.fieldWrap}>
                        <JempText type="caption" color={theme.textMuted} style={styles.label}>{t('onboarding.birthday_label_month')}</JempText>
                        <JempInput
                            ref={monthRef}
                            value={month}
                            onChangeText={handleMonth}
                            placeholder={t('onboarding.birthday_placeholder_month')}
                            keyboardType="number-pad"
                            maxLength={2}
                            textAlign="center"
                            style={styles.input}
                        />
                    </View>
                    <View style={[styles.fieldWrap, styles.yearField]}>
                        <JempText type="caption" color={theme.textMuted} style={styles.label}>{t('onboarding.birthday_label_year')}</JempText>
                        <JempInput
                            ref={yearRef}
                            value={year}
                            onChangeText={handleYear}
                            placeholder={t('onboarding.birthday_placeholder_year')}
                            keyboardType="number-pad"
                            maxLength={4}
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                            textAlign="center"
                            style={styles.input}
                        />
                    </View>
                </Animated.View>
            </View>
        </Pressable>
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
    row: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-end',
    },
    fieldWrap: {
        flex: 1,
        gap: 6,
    },
    yearField: {
        flex: 1.6,
    },
    label: {
        paddingLeft: 4,
    },
    input: {
        fontSize: 22,
        fontWeight: '700',
        paddingVertical: 14,
    },
});
