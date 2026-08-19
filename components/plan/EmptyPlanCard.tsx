import { Colors, Cyan, Electric } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import { useCallback, useRef } from "react";
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

    // autoPlay startet nicht zuverlässig, wenn der Screen beim Mount nicht
    // sichtbar ist — deshalb bei jedem Fokus explizit von vorn abspielen
    const lottieRef = useRef<LottieView>(null);
    useFocusEffect(useCallback(() => {
        lottieRef.current?.reset();
        lottieRef.current?.play();
    }, []));

    return (
        <View style={styles.emptyCard}>
            <LottieView
                ref={lottieRef}
                source={require('@/assets/animations/week-filled.json')}
                loop={false}
                style={styles.animation}
            />

            <JempText type="h1" style={styles.centeredText}>
                {t('ui.plan_empty_title')}
            </JempText>
            <JempText type="body-sm" color={theme.textMuted} style={styles.centeredText}>
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
    animation: { width: 96, height: 96, marginBottom: -4 },
    centeredText: { textAlign: 'center' },
    generateBtn: { marginTop: 16, width: '100%', borderRadius: 100, overflow: 'hidden' },
    generateBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
