import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';

export function NameStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const lastNameRef = useRef<TextInput>(null);

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
        <Pressable style={styles.container} onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
                <Text style={styles.headline}>Wie heißt du?</Text>
                <View style={styles.inputGroup}>
                    <TextInput
                        style={styles.input}
                        value={firstName}
                        onChangeText={handleFirstChange}
                        placeholder="Vorname"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        autoCapitalize="words"
                        autoFocus
                        returnKeyType="next"
                        onSubmitEditing={() => lastNameRef.current?.focus()}
                        selectionColor="white"
                        textAlign="center"
                    />
                    <View style={styles.underline} />
                </View>
                <View style={styles.inputGroup}>
                    <TextInput
                        ref={lastNameRef}
                        style={styles.input}
                        value={lastName}
                        onChangeText={handleLastChange}
                        placeholder="Nachname"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        autoCapitalize="words"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        selectionColor="white"
                        textAlign="center"
                    />
                    <View style={styles.underline} />
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 32,
    },
    headline: {
        color: 'white',
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    inputGroup: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        paddingVertical: 8,
        width: '100%',
        textAlign: 'center',
    },
    underline: {
        width: '100%',
        height: 2,
        backgroundColor: 'white',
        borderRadius: 1,
    },
});
