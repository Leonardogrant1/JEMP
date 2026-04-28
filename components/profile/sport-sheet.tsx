import { JempText } from '@/components/jemp-text';
import { getSportLabelI18n, SPORT_GROUPS } from '@/constants/sports';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

interface Props {
    visible: boolean;
    userId: string;
    currentSportId: string | null;
    onClose: () => void;
    onSaved: () => void;
}

export function SportSheet({ visible, userId, currentSportId, onClose, onSaved }: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setSelectedSlug(null);
        if (!currentSportId) return;
        supabase
            .from('sports')
            .select('slug')
            .eq('id', currentSportId)
            .single()
            .then(({ data }) => {
                if (data) setSelectedSlug(data.slug);
            });
    }, [visible, currentSportId]);

    async function handleSelect(slug: string) {
        setSelectedSlug(slug);
        setSaving(true);
        const { data } = await supabase.from('sports').select('id').eq('slug', slug).single();
        if (data) {
            await supabase.from('user_profiles').update({ sport_id: data.id }).eq('id', userId);
            setSaving(false);
            onSaved();
            onClose();
        } else {
            setSaving(false);
        }
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={onClose} hitSlop={12}>
                        <Ionicons name="close" size={24} color={theme.text} />
                    </Pressable>
                    <View style={styles.headerRight} />
                    {saving
                        ? <ActivityIndicator color={Cyan[500]} size="small" />
                        : <View style={styles.headerRight} />
                    }
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('ui.sport')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('plan.sport_sheet_subtitle')}
                    </JempText>

                    {SPORT_GROUPS.map((group) => (
                        <View key={group.titleKey} style={styles.group}>
                            <JempText type="caption" color={theme.textSubtle} style={styles.groupTitle}>
                                {t(group.titleKey as any).toUpperCase()}
                            </JempText>
                            <View style={styles.grid}>
                                {group.sports.map((sport) => {
                                    const active = selectedSlug === sport.slug;
                                    const label = getSportLabelI18n(sport.slug, t) ?? sport.slug;
                                    if (active) {
                                        return (
                                            <LinearGradient
                                                key={sport.slug}
                                                colors={GRADIENT}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.chipGradientBorder}
                                            >
                                                <View style={[styles.chipInner, { backgroundColor: theme.surface }]}>
                                                    <JempText type="caption" color={Cyan[400]} style={styles.chipText}>
                                                        {label}
                                                    </JempText>
                                                </View>
                                            </LinearGradient>
                                        );
                                    }
                                    return (
                                        <TouchableOpacity
                                            key={sport.slug}
                                            style={[styles.chip, { backgroundColor: theme.surface }]}
                                            onPress={() => handleSelect(sport.slug)}
                                            activeOpacity={0.7}
                                            disabled={saving}
                                        >
                                            <JempText type="caption" color={theme.textMuted} style={styles.chipText}>
                                                {label}
                                            </JempText>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerRight: { width: 24 },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
    bodyTitle: { marginBottom: 6 },
    subtitle: {
        lineHeight: 20,
        marginBottom: 28,
    },
    group: { marginBottom: 24 },
    groupTitle: {
        letterSpacing: 1,
        fontSize: 11,
        marginBottom: 10,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

    // Inactive chip
    chip: {
        borderRadius: 20,
        paddingVertical: 9,
        paddingHorizontal: 16,
    },

    // Active chip — gradient border via LinearGradient wrapper
    chipGradientBorder: {
        borderRadius: 20,
        padding: 1.5,
    },
    chipInner: {
        borderRadius: 18.5,
        paddingVertical: 7.5,
        paddingHorizontal: 14.5,
    },

    chipText: { fontSize: 14, fontWeight: '500' },
});
