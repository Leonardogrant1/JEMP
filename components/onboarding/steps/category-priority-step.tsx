import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { CATEGORY_LABELS } from '@/constants/category-labels';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore, TargetedCategory } from '@/stores/onboarding-store';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useTranslation } from 'react-i18next';

type CategoryItem = { id: string; slug: string };

export function CategoryPriorityStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const targetedCategories = useOnboardingStore((s) => s.targetedCategories);
    const [ranked, setRanked] = useState<CategoryItem[]>([]);
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        setRanked(targetedCategories.map((c) => ({ id: c.categoryId, slug: c.slug })));
        setCanContinue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function saveToStore(items: CategoryItem[]) {
        const payload: TargetedCategory[] = items.map((c, i) => ({
            categoryId: c.id,
            slug: c.slug,
            priority: i + 1,
        }));
        setStore({ targetedCategories: payload });
    }

    function handleDragEnd({ data }: { data: CategoryItem[] }) {
        setRanked(data);
        saveToStore(data);
    }

    if (ranked.length <= 1) return null;

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.category_priority_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.category_priority_subtitle')}
                </JempText>
            </Animated.View>
            <DraggableFlatList
                data={ranked}
                keyExtractor={(item) => item.id}
                onDragEnd={handleDragEnd}
                renderItem={({ item, getIndex, drag, isActive }: RenderItemParams<CategoryItem>) => {
                    const index = getIndex() ?? 0;
                    return (
                        <ScaleDecorator activeScale={1}>
                            <TouchableOpacity
                                onLongPress={drag}
                                delayLongPress={150}
                                activeOpacity={1}
                                style={[
                                    styles.row,
                                    { backgroundColor: isActive ? theme.cardElevated : theme.surface },
                                    isActive && styles.rowActive,
                                ]}
                            >
                                <JempText type="body-sm" color={theme.textMuted} style={styles.number}>
                                    {index + 1}
                                </JempText>
                                <JempText type="body-l" color={theme.text} style={styles.label}>
                                    {CATEGORY_LABELS[item.slug] ?? item.slug}
                                </JempText>
                                <Ionicons name="reorder-two" size={20} color={theme.textMuted} />
                            </TouchableOpacity>
                        </ScaleDecorator>
                    );
                }}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 32,
    },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 28 },
    list: { gap: 10 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 12,
    },
    number: {
        width: 20,
        textAlign: 'center',
    },
    label: { flex: 1 },
    rowActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
