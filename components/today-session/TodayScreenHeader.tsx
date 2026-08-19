import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";

export function TodayScreenHeader() {
    const { t } = useTranslation();

    return (
        <View style={styles.header}>
            <JempText type="h1">{t('tab.today')}</JempText>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
