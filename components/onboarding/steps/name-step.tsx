import { useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors, Fonts } from '@/constants/theme';
import { useUserDataStore } from '@/stores/UserDataStore';

export function NameStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const updateSettings = useUserDataStore((s) => s.updateSettings);
    const [name, setName] = useState('');

    const focusOffset = useRef(new Animated.Value(0)).current;

    function handleFocus() {
        Animated.timing(focusOffset, {
            toValue: -130,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }

    function handleBlur() {
        Animated.timing(focusOffset, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }

    function handleChange(value: string) {
        setName(value);
        setCanContinue(value.trim().length >= 2);
        if (value.trim().length >= 2) {
            updateSettings({ name: value.trim() });
        }
    }

    return (
        <Pressable style={styles.container} onPress={Keyboard.dismiss}>
            <View style={styles.inner} pointerEvents="box-none">
                <Animated.View style={[styles.content, { transform: [{ translateY: focusOffset }] }]}>
                    <Text style={styles.headline}>{t('onboarding.name.headline')}</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={handleChange}
                        placeholder={t('onboarding.name.placeholder')}
                        placeholderTextColor={Colors.textPlaceholder}
                        autoCapitalize="words"
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        selectionColor={Colors.accent}
                        textAlign="center"
                    />
                    <View style={styles.underline} />
                </Animated.View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        width: '100%',
        paddingHorizontal: 32,
        alignItems: 'center',
        gap: 8,
    },
    headline: {
        fontFamily: Fonts.serifBold,
        fontSize: 38,
        lineHeight: 50,
        color: Colors.textHeadline,
        textAlign: 'center',
        marginBottom: 28,
    },
    input: {
        fontFamily: Fonts.serifBold,
        fontSize: 32,
        color: Colors.textHeadline,
        paddingVertical: 8,
        width: '100%',
        textAlign: 'center',
    },
    underline: {
        width: '100%',
        height: 2,
        backgroundColor: Colors.textHeadline,
        borderRadius: 1,
    },
});
