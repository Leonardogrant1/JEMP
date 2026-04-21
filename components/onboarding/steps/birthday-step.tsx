import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';

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
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const monthRef = useRef<TextInput>(null);
    const yearRef = useRef<TextInput>(null);

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
                <Text style={styles.headline}>Wann wurdest du{'\n'}geboren?</Text>
                <View style={styles.row}>
                    <View style={styles.fieldWrap}>
                        <TextInput
                            style={styles.input}
                            value={day}
                            onChangeText={handleDay}
                            placeholder="TT"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="number-pad"
                            maxLength={2}
                            autoFocus
                            selectionColor="white"
                            textAlign="center"
                        />
                        <View style={styles.underline} />
                        <Text style={styles.label}>Tag</Text>
                    </View>
                    <Text style={styles.separator}>/</Text>
                    <View style={styles.fieldWrap}>
                        <TextInput
                            ref={monthRef}
                            style={styles.input}
                            value={month}
                            onChangeText={handleMonth}
                            placeholder="MM"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="number-pad"
                            maxLength={2}
                            selectionColor="white"
                            textAlign="center"
                        />
                        <View style={styles.underline} />
                        <Text style={styles.label}>Monat</Text>
                    </View>
                    <Text style={styles.separator}>/</Text>
                    <View style={[styles.fieldWrap, styles.yearField]}>
                        <TextInput
                            ref={yearRef}
                            style={styles.input}
                            value={year}
                            onChangeText={handleYear}
                            placeholder="JJJJ"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="number-pad"
                            maxLength={4}
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                            selectionColor="white"
                            textAlign="center"
                        />
                        <View style={styles.underline} />
                        <Text style={styles.label}>Jahr</Text>
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
        gap: 40,
    },
    headline: {
        color: 'white',
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    fieldWrap: {
        alignItems: 'center',
        width: 64,
    },
    yearField: {
        width: 88,
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
    label: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 6,
    },
    separator: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 28,
        fontWeight: '300',
        marginBottom: 10,
    },
});
