import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

export function ManifestationPitchStep() {
    const [text, setText] = useState('');

    function handleChange(value: string) {
        setText(value);
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <Text style={styles.title}>Dein Traumalltag</Text>
                <Text style={styles.subtitle}>
                    Beschreibe wie dein perfekter Tag in 5 Jahren aussieht. Je konkreter, desto besser.
                </Text>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={handleChange}
                    placeholder="Ich wache auf und..."
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    multiline
                    textAlignVertical="top"
                    maxLength={300}
                />
                <Text style={styles.counter}>{text.length}/300</Text>
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
        marginBottom: 10,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
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
