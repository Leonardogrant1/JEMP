import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors, Fonts } from '@/constants/theme';
import { useUserDataStore } from '@/stores/UserDataStore';

export function VisionStep() {
    const { t } = useTranslation();
    const { setCanContinue, setVisionDescription } = useOnboardingControl();
    const updateSettings = useUserDataStore((s) => s.updateSettings);
    const name = useUserDataStore((s) => s.name);
    const [text, setText] = useState('');

    const focusOffset = useRef(new Animated.Value(0)).current;

    function handleChange(value: string) {
        setText(value);
        setCanContinue(value.trim().length >= 5);
        setVisionDescription(value);
        updateSettings({ visionDescription: value });
    }

    function handleFocus() {
        Animated.timing(focusOffset, {
            toValue: -120,
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

    return (
        <Pressable style={styles.container} onPress={Keyboard.dismiss}>
            <View style={styles.inner} pointerEvents="box-none">
                <Animated.View style={[styles.content, { transform: [{ translateY: focusOffset }] }]}>
                    <Text style={styles.headline}>{name ? t('onboarding.vision.headline_with_name', { name }) : t('onboarding.vision.headline')}</Text>
                    <Text style={styles.subtext}>{t('onboarding.vision.subtitle')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('onboarding.vision.placeholder')}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={text}
                        onChangeText={handleChange}
                        multiline
                        autoFocus
                        submitBehavior="blurAndSubmit"
                        returnKeyType="done"
                        selectionColor={Colors.accent}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
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
        paddingHorizontal: 28,
        gap: 14,
        alignItems: 'center',
    },
    headline: {
        color: 'white',
        fontFamily: Fonts.serifBold,
        fontSize: 26,
        textAlign: 'center',
    },
    subtext: {
        color: 'rgba(255,255,255,0.45)',
        fontFamily: Fonts.satoshiRegular,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        color: 'white',
        fontFamily: Fonts.satoshiRegular,
        fontSize: 17,
        lineHeight: 26,
        textAlign: 'center',
        minHeight: 80,
    },
});
