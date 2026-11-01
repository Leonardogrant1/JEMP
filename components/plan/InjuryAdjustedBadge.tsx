import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity } from 'react-native';

// Task 8 (Plan B Intake): sichtbares Signal, wenn der aktive Plan wegen
// aktiver Verletzungs-Constraints angepasst wurde (workout_plans.injury_adjusted).
// Tap öffnet das Detail-Sheet mit Constraints + Arzt-Note + Prio-Konflikten.
export function InjuryAdjustedBadge() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <TouchableOpacity
            style={[styles.badge, { backgroundColor: `${GradientMid}18`, borderColor: `${GradientMid}55` }]}
            onPress={() => router.push('/injury-plan-info')}
            activeOpacity={0.7}
        >
            <Ionicons name="shield-checkmark" size={16} color={GradientMid} />
            <JempText type="caption" color={GradientMid} style={styles.label}>
                {t('injuries.badge_label')}
            </JempText>
            <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    label: { flexShrink: 1 },
});
