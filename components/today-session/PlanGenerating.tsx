import { Cyan, Electric } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";



export function PlanGenerating() {

    const { t } = useTranslation();
    const router = useRouter();

    return (
        <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color={Electric[500]} />
            <JempText type="h2" style={styles.centeredText}>
                {t('planGeneration.hint')}
            </JempText>
            <Pressable onPress={() => router.push('/(tabs)/plan')} style={styles.progressBtn}>
                <LinearGradient
                    colors={[Cyan[500], Electric[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressBtnGradient}
                >
                    <JempText type="button" color="#fff">{t('planGeneration.hint_tap')}</JempText>
                </LinearGradient>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    generatingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        paddingHorizontal: 32,
    },
    centeredText: { textAlign: 'center' },
    progressBtn: { width: '100%', borderRadius: 100, overflow: 'hidden' },
    progressBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
})