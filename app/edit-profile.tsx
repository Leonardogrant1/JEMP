import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { cmToFt, ftToCm, kgToLbs, lbsToKg } from '@/helpers/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUnitSystem } from '@/hooks/use-unit-system';
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

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

export default function EditProfileScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile, refreshProfile } = useCurrentUser();
    const router = useRouter();

    const [firstName, setFirstName] = useState(profile?.first_name ?? '');
    const [lastName, setLastName] = useState(profile?.last_name ?? '');
    const [day, setDay] = useState(() => profile?.birth_date ? String(parseInt(profile.birth_date.split('-')[2], 10)) : '');
    const [month, setMonth] = useState(() => profile?.birth_date ? String(parseInt(profile.birth_date.split('-')[1], 10)) : '');
    const [year, setYear] = useState(() => profile?.birth_date ? profile.birth_date.split('-')[0] : '');
    const unitSystem = useUnitSystem();
    const imperial = unitSystem === 'imperial';
    const [weight, setWeight] = useState(() => {
        if (!profile?.weight_in_kg) return '';
        return String(imperial ? kgToLbs(profile.weight_in_kg) : profile.weight_in_kg);
    });
    const [height, setHeight] = useState(profile?.height_in_cm ? String(profile.height_in_cm) : '');
    const [heightFt, setHeightFt] = useState(() => profile?.height_in_cm ? String(cmToFt(profile.height_in_cm).ft) : '');
    const [heightIn, setHeightIn] = useState(() => profile?.height_in_cm ? String(cmToFt(profile.height_in_cm).in) : '');
    const [gender, setGender] = useState<'male' | 'female' | null>(
        profile?.gender === 'male' || profile?.gender === 'female' ? profile.gender : null,
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const monthRef = useRef<TextInput>(null);
    const yearRef = useRef<TextInput>(null);

    const slideValue = useSharedValue(600);
    const overlayValue = useSharedValue(0);

    // Entrance animation starts on first layout (no effect — keeps the
    // react-hooks/immutability lint rule happy)
    const entered = useRef(false);
    function handleSheetLayout() {
        if (entered.current) return;
        entered.current = true;
        overlayValue.value = withTiming(1, { duration: 250 });
        slideValue.value = withTiming(0, { duration: 300 });
    }

    function goBack() {
        router.back();
    }

    function handleClose() {
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(goBack);
        });
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    const dd = parseInt(day, 10);
    const mm = parseInt(month, 10);
    const yy = parseInt(year, 10);
    const birthValid = year.length === 4 && isValidDate(dd, mm, yy) && isAtLeast13(dd, mm, yy);

    // Inputs are in the preferred unit — convert to metric for validation/storage
    const weightInput = weight.trim() === '' ? null : parseInt(weight, 10);
    const weightKg = weightInput === null ? null : imperial ? lbsToKg(weightInput) : weightInput;
    const heightCm = imperial
        ? (heightFt.trim() === '' ? null : ftToCm(parseInt(heightFt, 10), heightIn.trim() === '' ? 0 : parseInt(heightIn, 10)))
        : (height.trim() === '' ? null : parseInt(height, 10));
    const weightValid = weightKg === null || (weightKg >= 30 && weightKg <= 300);
    const heightValid = heightCm === null || (heightCm >= 100 && heightCm <= 250);
    const canSave = firstName.trim().length > 0 && birthValid && weightValid && heightValid && !saving;

    async function handleSave() {
        if (!profile || !canSave) return;
        setSaving(true);
        setError(null);
        const birthIso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
                first_name: firstName.trim(),
                last_name: lastName.trim() || null,
                birth_date: birthIso,
                weight_in_kg: weightKg,
                height_in_cm: heightCm,
                gender,
            })
            .eq('id', profile.id);
        if (updateError) {
            setSaving(false);
            setError(updateError.message);
            return;
        }
        await refreshProfile();
        setSaving(false);
        handleClose();
    }

    const numeric = (val: string, maxLen: number) => val.replace(/\D/g, '').slice(0, maxLen);

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <KeyboardAvoidingView behavior="padding" style={styles.avoidingView}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                <Reanimated.View onLayout={handleSheetLayout} style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}>
                        <ScrollView
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                                <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                                <View style={styles.header}>
                                    <JempText type="h2" color={theme.text}>
                                        {t('ui.edit_profile_title')}
                                    </JempText>
                                    <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                        <Ionicons name="close" size={22} color={theme.textMuted} />
                                    </TouchableOpacity>
                                </View>

                                {/* Name */}
                                <View style={styles.row}>
                                    <View style={styles.field}>
                                        <JempText type="caption" color={theme.textMuted}>
                                            {t('ui.edit_profile_first_name')}
                                        </JempText>
                                        <JempInput
                                            variant="outlined"
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                    <View style={styles.field}>
                                        <JempText type="caption" color={theme.textMuted}>
                                            {t('ui.edit_profile_last_name')}
                                        </JempText>
                                        <JempInput
                                            variant="outlined"
                                            value={lastName}
                                            onChangeText={setLastName}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                </View>

                                {/* Birthday */}
                                <View style={styles.fieldBlock}>
                                    <JempText type="caption" color={theme.textMuted}>
                                        {t('ui.edit_profile_birthday')}
                                    </JempText>
                                    <View style={styles.row}>
                                        <JempInput
                                            variant="outlined"
                                            value={day}
                                            onChangeText={v => {
                                                const cleaned = numeric(v, 2);
                                                setDay(cleaned);
                                                if (cleaned.length === 2) monthRef.current?.focus();
                                            }}
                                            placeholder={t('onboarding.birthday_placeholder_day')}
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            textAlign="center"
                                            style={styles.dateInput}
                                        />
                                        <JempInput
                                            ref={monthRef}
                                            variant="outlined"
                                            value={month}
                                            onChangeText={v => {
                                                const cleaned = numeric(v, 2);
                                                setMonth(cleaned);
                                                if (cleaned.length === 2) yearRef.current?.focus();
                                            }}
                                            placeholder={t('onboarding.birthday_placeholder_month')}
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            textAlign="center"
                                            style={styles.dateInput}
                                        />
                                        <JempInput
                                            ref={yearRef}
                                            variant="outlined"
                                            value={year}
                                            onChangeText={v => setYear(numeric(v, 4))}
                                            placeholder={t('onboarding.birthday_placeholder_year')}
                                            keyboardType="number-pad"
                                            maxLength={4}
                                            textAlign="center"
                                            style={[styles.dateInput, styles.yearInput]}
                                        />
                                    </View>
                                </View>

                                {/* Weight / Height — inputs in the preferred unit system */}
                                <View style={styles.row}>
                                    <View style={styles.field}>
                                        <JempText type="caption" color={theme.textMuted}>
                                            {t('ui.weight')} ({imperial ? 'lbs' : 'kg'})
                                        </JempText>
                                        <JempInput
                                            variant="outlined"
                                            value={weight}
                                            onChangeText={v => setWeight(numeric(v, 3))}
                                            keyboardType="number-pad"
                                            maxLength={3}
                                        />
                                    </View>
                                    {imperial ? (
                                        <View style={styles.field}>
                                            <JempText type="caption" color={theme.textMuted}>
                                                {t('ui.height')} (ft / in)
                                            </JempText>
                                            <View style={styles.row}>
                                                <JempInput
                                                    variant="outlined"
                                                    value={heightFt}
                                                    onChangeText={v => setHeightFt(numeric(v, 1))}
                                                    keyboardType="number-pad"
                                                    maxLength={1}
                                                    textAlign="center"
                                                    style={styles.dateInput}
                                                />
                                                <JempInput
                                                    variant="outlined"
                                                    value={heightIn}
                                                    onChangeText={v => setHeightIn(numeric(v, 2))}
                                                    keyboardType="number-pad"
                                                    maxLength={2}
                                                    textAlign="center"
                                                    style={styles.dateInput}
                                                />
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.field}>
                                            <JempText type="caption" color={theme.textMuted}>
                                                {t('ui.height')} (cm)
                                            </JempText>
                                            <JempInput
                                                variant="outlined"
                                                value={height}
                                                onChangeText={v => setHeight(numeric(v, 3))}
                                                keyboardType="number-pad"
                                                maxLength={3}
                                            />
                                        </View>
                                    )}
                                </View>

                                {/* Gender */}
                                <View style={styles.fieldBlock}>
                                    <JempText type="caption" color={theme.textMuted}>
                                        {t('ui.gender')}
                                    </JempText>
                                    <View style={styles.chipRow}>
                                        <SelectableChip
                                            label={t('ui.male')}
                                            selected={gender === 'male'}
                                            onPress={() => setGender('male')}
                                        />
                                        <SelectableChip
                                            label={t('ui.female')}
                                            selected={gender === 'female'}
                                            onPress={() => setGender('female')}
                                        />
                                    </View>
                                </View>

                                {error && (
                                    <JempText type="caption" color="#ef4444">
                                        {error}
                                    </JempText>
                                )}

                                <TouchableOpacity
                                    style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                                    onPress={handleSave}
                                    disabled={!canSave}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    {saving ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <JempText type="body-l" color="#fff">{t('ui.save')}</JempText>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                </Reanimated.View>
            </KeyboardAvoidingView>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    avoidingView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '100%',
    },
    content: {
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 16,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    field: {
        flex: 1,
        gap: 6,
    },
    fieldBlock: {
        gap: 6,
    },
    dateInput: {
        flex: 1,
        textAlign: 'center',
    },
    yearInput: {
        flex: 1.6,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
    },
    saveButton: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
        width: '100%',
        overflow: 'hidden',
    },
    saveButtonDisabled: {
        opacity: 0.35,
    },
});
