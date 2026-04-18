import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';

export function VisionInputStep() {
    const { setCanContinue } = useOnboardingControl();
    const [text, setText] = useState('');

    function handleChange(value: string) {
        setText(value);
        setCanContinue(value.trim().length >= 10);
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
            <Text style={styles.title}>Wo siehst du dich{'\n'}in 5 Jahren?</Text>
            <Text style={styles.subtitle}>Beschreibe deine Vision so konkret wie möglich.</Text>
            <TextInput
                style={styles.input}
                value={text}
                onChangeText={handleChange}
                placeholder="Ich lebe in..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
                textAlignVertical="top"
                maxLength={500}
            />
            <Text style={styles.counter}>{text.length}/500</Text>
        </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 32,
    },
    title: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 36,
        marginBottom: 10,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 28,
    },
    input: {
        color: 'white',
        fontSize: 16,
        lineHeight: 24,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: 16,
        height: 180,
    },
    counter: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
        textAlign: 'right',
        marginTop: 8,
    },
});
