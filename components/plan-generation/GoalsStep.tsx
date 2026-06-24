import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { CategoryItem } from '@/types/plan-generation';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';

export function GoalsStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const {
        goalsSubPhase,
        allCategories, selectedCategoryIds, rankedCategories,
        toggleCategory, setRankedCategories,
    } = usePlanWizardStore();

    if (goalsSubPhase === 'select') {
        return (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('goals.select_title')}</JempText>
                <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                    {t('goals.select_subtitle')}
                </JempText>
                <View style={styles.chipGrid}>
                    {allCategories.map(cat => (
                        <SelectableChip
                            key={cat.id}
                            label={cat.label}
                            selected={selectedCategoryIds.has(cat.id)}
                            onPress={() => toggleCategory(cat.id)}
                        />
                    ))}
                </View>
            </ScrollView>
        );
    }

    return (
        <DraggableFlatList
            data={rankedCategories}
            keyExtractor={item => item.id}
            onDragEnd={({ data }) => setRankedCategories(data)}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, drag }: RenderItemParams<CategoryItem>) => {
                const index = rankedCategories.indexOf(item);
                return (
                    <ScaleDecorator activeScale={1.03}>
                        <TouchableOpacity
                            onLongPress={drag}
                            activeOpacity={1}
                            style={[styles.rankRow, { backgroundColor: theme.surface }]}
                        >
                            <JempText type="caption" color={theme.textMuted} style={styles.rankNumber}>
                                {index + 1}
                            </JempText>
                            <JempText type="body-l" color={theme.text} style={{ flex: 1 }}>
                                {item.label}
                            </JempText>
                            <Ionicons name="reorder-three-outline" size={22} color={theme.textMuted} />
                        </TouchableOpacity>
                    </ScaleDecorator>
                );
            }}
            ListHeaderComponent={
                <View>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('goals.rank_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('goals.rank_subtitle')}
                    </JempText>
                </View>
            }
        />
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 10,
    },
    rankNumber: { width: 20, textAlign: 'center' },
});
