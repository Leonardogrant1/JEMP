import { Colors, Cyan, Electric } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { JempText } from "../jemp-text";

interface EmptyPlanCardProps {
    onGenerate: () => void;
}

export function EmptyPlanCard({ onGenerate }: EmptyPlanCardProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={[styles.emptyCard]}>
            <JempText type="h2" style={styles.centeredText}>
                {t('ui.plan_empty_title')}
            </JempText>
            <JempText type="body-l" color={theme.textMuted} style={styles.centeredText}>
                {t('ui.plan_empty_subtitle')}
            </JempText>
            <TouchableOpacity style={styles.generateBtn} onPress={onGenerate}>
                <LinearGradient
                    colors={[Cyan[500], Electric[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.generateBtnGradient}
                >
                    <JempText type="button" color="#fff">{t('ui.plan_generate')}</JempText>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 12, flex: 1, justifyContent: "center" },
    centeredText: { textAlign: 'center' },
    generateBtn: { marginTop: 8, width: '100%', borderRadius: 100, overflow: 'hidden' },
    generateBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
