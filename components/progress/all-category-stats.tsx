import { RADAR_SLUGS } from "@/constants/progress-constants";
import { StyleSheet, View } from "react-native";
import { GaugeCard } from "./gauge-card";
import { OverallCard } from "./overall-card";


export function AllCategoryStats({ levels, trends, overallScore, overallTrend }: {
    levels: Record<string, number | undefined>;
    trends: Record<string, number | null>;
    overallScore: number | null;
    overallTrend: number | null;
}) {
    return (
        <>
            {overallScore !== null && <OverallCard value={overallScore} trend={overallTrend} />}
            <View style={styles.statsGrid}>
                {RADAR_SLUGS.map(slug => (
                    <GaugeCard
                        key={slug}
                        slug={slug}
                        value={levels[slug]}
                        trend={trends[slug] ?? null}
                    />
                ))}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});