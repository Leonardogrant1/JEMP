import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const OPTIONS = [30, 45, 60, 90];

type Props = {
    visible: boolean;
    dayLabel: string;
    currentMinutes: number | null;
    defaultMinutes: number;
    onSelect: (minutes: number | null) => void;
    onClose: () => void;
};

/** Bottom sheet: Dauer-Override für einen einzelnen Trainingstag (Spec §3.1). */
export function DayDurationSheet({ visible, dayLabel, currentMinutes, defaultMinutes, onSelect, onClose }: Props) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    function pick(minutes: number | null) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(minutes);
        onClose();
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]} onPress={() => {}}>
                    <JempText type="h3" style={styles.title}>{t('day_duration.title')}</JempText>
                    <JempText type="body-sm" color={theme.textMuted} style={styles.subtitle}>{dayLabel}</JempText>
                    <View style={styles.options}>
                        <Pressable
                            onPress={() => pick(null)}
                            style={[styles.option, { borderColor: currentMinutes === null ? GradientMid : theme.borderDivider }]}
                        >
                            <JempText type="body-l" color={currentMinutes === null ? GradientMid : theme.text}>
                                {t('day_duration.standard', { minutes: defaultMinutes })}
                            </JempText>
                        </Pressable>
                        {OPTIONS.map((m) => (
                            <Pressable
                                key={m}
                                onPress={() => pick(m)}
                                style={[styles.option, { borderColor: currentMinutes === m ? GradientMid : theme.borderDivider }]}
                            >
                                <JempText type="body-l" color={currentMinutes === m ? GradientMid : theme.text}>{`${m} min`}</JempText>
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    title: { marginBottom: 4 },
    subtitle: { marginBottom: 16 },
    options: { gap: 10 },
    option: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
});
