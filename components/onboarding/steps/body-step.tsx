import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';

export function BodyStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const weightRef = useRef<TextInput>(null);

    function validate(h: string, w: string) {
        const hVal = parseInt(h, 10);
        const wVal = parseFloat(w);
        const valid =
            !isNaN(hVal) && hVal >= 50 && hVal <= 300 &&
            !isNaN(wVal) && wVal >= 20 && wVal <= 500;
        setCanContinue(valid);
        if (valid) {
            setStore({ height_in_cm: hVal, weight_in_kg: wVal });
        }
    }

    function handleHeight(val: string) {
        const cleaned = val.replace(/\D/g, '');
        setHeight(cleaned);
        validate(cleaned, weight);
    }

    function handleWeight(val: string) {
        const cleaned = val.replace(/[^0-9.]/g, '');
        setWeight(cleaned);
        validate(height, cleaned);
    }

    return (
        <Pressable style={styles.container} onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
                <Text style={styles.headline}>Körpermaße</Text>
                <View style={styles.row}>
                    <View style={styles.fieldWrap}>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                value={height}
                                onChangeText={handleHeight}
                                placeholder="180"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                keyboardType="number-pad"
                                maxLength={3}
                                autoFocus
                                returnKeyType="next"
                                onSubmitEditing={() => weightRef.current?.focus()}
                                selectionColor="white"
                                textAlign="center"
                            />
                            <Text style={styles.unit}>cm</Text>
                        </View>
                        <View style={styles.underline} />
                        <Text style={styles.label}>Größe</Text>
                    </View>
                    <View style={styles.fieldWrap}>
                        <View style={styles.inputRow}>
                            <TextInput
                                ref={weightRef}
                                style={styles.input}
                                value={weight}
                                onChangeText={handleWeight}
                                placeholder="75"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                keyboardType="decimal-pad"
                                maxLength={5}
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                selectionColor="white"
                                textAlign="center"
                            />
                            <Text style={styles.unit}>kg</Text>
                        </View>
                        <View style={styles.underline} />
                        <Text style={styles.label}>Gewicht</Text>
                    </View>
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
        gap: 48,
    },
    headline: {
        color: 'white',
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        gap: 32,
    },
    fieldWrap: {
        alignItems: 'center',
        width: 100,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    input: {
        color: 'white',
        fontSize: 36,
        fontWeight: '700',
        paddingVertical: 8,
        textAlign: 'center',
        minWidth: 60,
    },
    unit: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 18,
        fontWeight: '500',
    },
    underline: {
        width: '100%',
        height: 2,
        backgroundColor: 'white',
        borderRadius: 1,
    },
    label: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 6,
    },
});
