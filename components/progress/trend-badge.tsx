import { Cyan } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { JempText } from "../jemp-text";

export function TrendBadge({ trend, light }: { trend: number; light?: boolean }) {
    const up = trend >= 0;
    const color = light ? 'rgba(255,255,255,0.9)' : up ? Cyan[400] : '#ef4444';
    return (
        <View style={styles.trendBadge}>
            <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={color} />
            <JempText type="caption" color={color} style={styles.trendText}>
                {up ? `+${trend}` : String(trend)}
            </JempText>
        </View>
    );
}

const styles = StyleSheet.create({
    trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    trendText: { fontWeight: '600' },
});  