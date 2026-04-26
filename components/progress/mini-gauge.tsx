import { GAUGE_START, GAUGE_SWEEP, MINI_CX, MINI_CY, MINI_R, MINI_SIZE, MINI_STROKE } from "@/constants/progress-constants";
import { svgArcPath } from "@/helpers/progress-helpers";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { JempText } from "../jemp-text";

export function MiniGauge({ score, color }: { score: number; color: string }) {
    const fillSweep = Math.max(0, (score / 100) * GAUGE_SWEEP);
    const bgPath = svgArcPath(MINI_CX, MINI_CY, MINI_R, GAUGE_START, GAUGE_START + GAUGE_SWEEP);
    const fillPath = score > 0
        ? svgArcPath(MINI_CX, MINI_CY, MINI_R, GAUGE_START, GAUGE_START + fillSweep)
        : null;

    return (
        <View style={{ width: MINI_SIZE, height: MINI_SIZE }}>
            <Svg width={MINI_SIZE} height={MINI_SIZE}>
                <Path d={bgPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={MINI_STROKE} strokeLinecap="round" />
                {fillPath && (
                    <Path d={fillPath} fill="none" stroke={color} strokeWidth={MINI_STROKE} strokeLinecap="round" />
                )}
            </Svg>
            <View style={[StyleSheet.absoluteFill, styles.gaugeCenter]}>
                <JempText type="caption" color={color} style={styles.miniGaugeScore}>
                    {score}
                </JempText>
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    gaugeCenter: { alignItems: 'center', justifyContent: 'center' },
    miniGaugeScore: { fontSize: 12, fontWeight: '700', letterSpacing: -0.3 }
});