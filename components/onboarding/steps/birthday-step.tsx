import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { StepScaffold } from '@/components/onboarding/step-scaffold';
import { NumberWheel } from '@/components/ui/number-wheel';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

const MIN_YEAR = 1950;
const MAX_YEAR = new Date().getFullYear();

function isValidDate(day: number, month: number, year: number): boolean {
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
    const { t, i18n } = useTranslation();
    const { setCanContinue } = useOnboardingControl();

    // Lokalisierte Monats-Kurznamen fürs Rad — gespeichert wird weiter numerisch/ISO
    function monthLabel(m: number): string {
        return new Date(2000, m - 1, 1).toLocaleDateString(i18n.language, { month: 'short' });
    }
    const storedBirthDate = useOnboardingStore((s) => s.birth_date);
    const setStore = useOnboardingStore((s) => s.set);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const [day, setDay] = useState(() => storedBirthDate ? parseInt(storedBirthDate.split('-')[2], 10) : 15);
    const [month, setMonth] = useState(() => storedBirthDate ? parseInt(storedBirthDate.split('-')[1], 10) : 6);
    const [year, setYear] = useState(() => storedBirthDate ? parseInt(storedBirthDate.split('-')[0], 10) : 2000);

    function validate(d: number, m: number, y: number) {
        if (!isValidDate(d, m, y) || !isAtLeast13(d, m, y)) {
            setCanContinue(false);
            return;
        }
        const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        setStore({ birth_date: iso });
        setCanContinue(true);
    }

    useEffect(() => {
        validate(day, month, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleDay(v: number) {
        setDay(v);
        validate(v, month, year);
    }

    function handleMonth(v: number) {
        setMonth(v);
        validate(day, v, year);
    }

    function handleYear(v: number) {
        setYear(v);
        validate(day, month, v);
    }

    return (
        <StepScaffold title={t('onboarding.birthday_title')} subtitle={t('onboarding.birthday_subtitle')} centerContent>
            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()} style={styles.row}>
                <View style={styles.fieldWrap}>
                    <JempText type="caption" color={theme.textMuted} style={styles.label}>
                        {t('onboarding.birthday_label_day')}
                    </JempText>
                    <NumberWheel
                        initialValue={day}
                        min={1}
                        max={31}
                        extendable={false}
                        onChange={handleDay}
                    />
                </View>
                <View style={styles.fieldWrap}>
                    <JempText type="caption" color={theme.textMuted} style={styles.label}>
                        {t('onboarding.birthday_label_month')}
                    </JempText>
                    <NumberWheel
                        initialValue={month}
                        min={1}
                        max={12}
                        extendable={false}
                        formatLabel={monthLabel}
                        onChange={handleMonth}
                    />
                </View>
                <View style={[styles.fieldWrap, styles.yearField]}>
                    <JempText type="caption" color={theme.textMuted} style={styles.label}>
                        {t('onboarding.birthday_label_year')}
                    </JempText>
                    <NumberWheel
                        initialValue={year}
                        min={MIN_YEAR}
                        max={MAX_YEAR}
                        extendable={false}
                        onChange={handleYear}
                    />
                </View>
            </Animated.View>
        </StepScaffold>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    fieldWrap: {
        flex: 1,
        gap: 6,
    },
    yearField: {
        flex: 1.3,
    },
    label: {
        textAlign: 'center',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
});
