import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { JempInput } from '@/components/ui/jemp-input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

export function NameStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedFirstName = useOnboardingStore((s) => s.first_name);
    const storedLastName = useOnboardingStore((s) => s.last_name);
    const setStore = useOnboardingStore((s) => s.set);
    const [firstName, setFirstName] = useState(storedFirstName ?? '');
    const [lastName, setLastName] = useState(storedLastName ?? '');
    const lastNameRef = useRef<TextInput>(null);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        validate(firstName, lastName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function validate(first: string, last: string) {
        const valid = first.trim().length >= 2 && last.trim().length >= 2;
        setCanContinue(valid);
        if (valid) {
            setStore({ first_name: first.trim(), last_name: last.trim() });
        }
    }

    function handleFirstChange(value: string) {
        setFirstName(value);
        validate(value, lastName);
    }

    function handleLastChange(value: string) {
        setLastName(value);
        validate(firstName, value);
    }

    return (
        <KeyboardAwareScrollView
            style={styles.container}
            contentContainerStyle={styles.inner}
            keyboardShouldPersistTaps="handled"
        >
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.headline}>{t('onboarding.name_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.name_subtitle')}
                </JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()} style={styles.inputGroup}>
                <JempInput
                    value={firstName}
                    onChangeText={handleFirstChange}
                    placeholder={t('onboarding.name_first_placeholder')}
                    autoCapitalize="words"
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                    textAlign="center"
                />
                <JempInput
                    ref={lastNameRef}
                    value={lastName}
                    onChangeText={handleLastChange}
                    placeholder={t('onboarding.name_last_placeholder')}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    textAlign="center"
                />
            </Animated.View>
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
    inputGroup: {
        gap: 12,
    },
});
