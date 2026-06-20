import { Colors, Cyan, Electric } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";

interface TodayScreenHeaderProps {
    profile: {
        first_name: string | null;
        last_name: string | null;
    } | null;
}

export function TodayScreenHeader({ profile }: TodayScreenHeaderProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.header}>
            <View>
                <JempText type="body-sm" color={theme.textMuted}>{t('ui.welcome_back')}</JempText>
                <JempText type="h1">{profile?.first_name}</JempText>
            </View>
            <LinearGradient
                colors={[Cyan[500], Electric[500]]}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={styles.avatarRing}
            >
                <View style={[styles.avatarInner, { backgroundColor: theme.surface }]}>
                    <JempText type="button" color={theme.text}>
                        {[profile?.first_name, profile?.last_name]
                            .filter(Boolean)
                            .map(n => n![0].toUpperCase())
                            .join('')}
                    </JempText>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    avatarRing: {
        width: 44,
        height: 44,
        borderRadius: 22,
        padding: 2,
    },
    avatarInner: {
        flex: 1,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
