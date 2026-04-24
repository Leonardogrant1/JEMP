import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Modal, Pressable, ScrollView,
    StyleSheet, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Data ─────────────────────────────────────────────────────────────────────

const ENV_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    gym: 'barbell-outline',
    outdoor: 'leaf-outline',
    home: 'home-outline',
};

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'environment' | 'equipment';
type EnvItem = { id: string; slug: string; icon: keyof typeof Ionicons.glyphMap };
type EquipmentItem = { id: string; slug: string };

interface Props {
    visible: boolean;
    userId: string;
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EquipmentSheet({ visible, userId, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t } = useTranslation();

    const [phase, setPhase] = useState<Phase>('environment');
    const [allEnvs, setAllEnvs] = useState<EnvItem[]>([]);
    const [selectedEnvIds, setSelectedEnvIds] = useState<Set<string>>(new Set());
    const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // envId -> equipment items for that environment
    const [equipmentByEnv, setEquipmentByEnv] = useState<Map<string, EquipmentItem[]>>(new Map());

    useEffect(() => {
        if (!visible) return;
        setPhase('environment');
        setLoading(true);

        Promise.all([
            supabase.from('environments').select('id, slug'),
            supabase.from('user_equipments').select('equipment_id').eq('user_id', userId),
            supabase.from('environment_equipments').select('environment_id, equipment:equipments(id, slug)'),
        ]).then(async ([envsRes, userEquipRes, envEqRes]) => {
            const currentEquipmentIds = new Set((userEquipRes.data ?? []).map(r => r.equipment_id));
            setSelectedEquipmentIds(currentEquipmentIds);

            // Build envId -> EquipmentItem[] map
            const byEnv = new Map<string, EquipmentItem[]>();
            for (const row of envEqRes.data ?? []) {
                const eq = (row.equipment as any);
                if (!eq) continue;
                if (!byEnv.has(row.environment_id)) byEnv.set(row.environment_id, []);
                byEnv.get(row.environment_id)!.push({ id: eq.id, slug: eq.slug });
            }
            setEquipmentByEnv(byEnv);

            if (envsRes.data) {
                const envItems: EnvItem[] = envsRes.data.map(e => ({
                    id: e.id,
                    slug: e.slug,
                    icon: ENV_ICONS[e.slug] ?? 'location-outline',
                }));
                setAllEnvs(envItems);

                if (currentEquipmentIds.size > 0) {
                    const { data: envEqRows } = await supabase
                        .from('environment_equipments')
                        .select('environment_id')
                        .in('equipment_id', [...currentEquipmentIds]);
                    if (envEqRows) {
                        setSelectedEnvIds(new Set(envEqRows.map(r => r.environment_id)));
                    }
                } else {
                    setSelectedEnvIds(new Set());
                }
            }
            setLoading(false);
        });
    }, [visible, userId]);

    function toggleEnv(id: string) {
        setSelectedEnvIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleEquipment(id: string) {
        setSelectedEquipmentIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function goToEquipment() {
        // Merge equipment from all selected environments, deduplicated
        const map = new Map<string, EquipmentItem>();
        for (const envId of selectedEnvIds) {
            for (const eq of equipmentByEnv.get(envId) ?? []) {
                if (!map.has(eq.id)) map.set(eq.id, eq);
            }
        }
        setAllEquipment([...map.values()].sort((a, b) => a.slug.localeCompare(b.slug)));
        setPhase('equipment');
    }

    async function save() {
        setSaving(true);
        await supabase.from('user_equipments').delete().eq('user_id', userId);
        if (selectedEquipmentIds.size > 0) {
            await supabase.from('user_equipments').insert(
                [...selectedEquipmentIds].map(equipment_id => ({ user_id: userId, equipment_id }))
            );
        }
        setSaving(false);
        onClose();
    }

    const canProceed = phase === 'environment' ? selectedEnvIds.size > 0 : true;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: theme.borderDivider }]}>
                    <Pressable
                        onPress={phase === 'equipment' ? () => setPhase('environment') : onClose}
                        hitSlop={12}
                    >
                        <Ionicons
                            name={phase === 'equipment' ? 'arrow-back' : 'close'}
                            size={24}
                            color={theme.text}
                        />
                    </Pressable>
                    <View style={styles.headerRight} />
                    {phase === 'equipment' ? (
                        saving ? (
                            <ActivityIndicator color={Cyan[500]} size="small" />
                        ) : (
                            <Pressable onPress={save} hitSlop={12}>
                                <JempText type="body-l" color={theme.text} style={styles.actionBtn}>Speichern</JempText>
                            </Pressable>
                        )
                    ) : (
                        <Pressable onPress={goToEquipment} disabled={!canProceed} hitSlop={12}>
                            <JempText
                                type="body-l"
                                color={canProceed ? theme.text : theme.textSubtle}
                                style={styles.actionBtn}
                            >
                                Weiter
                            </JempText>
                        </Pressable>
                    )}
                </View>

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator color={Cyan[500]} />
                    </View>
                ) : phase === 'environment' ? (
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <JempText type="h1" color={theme.text} style={styles.bodyTitle}>Umgebung</JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            Wo trainierst du? Wähle alle zutreffenden Umgebungen.
                        </JempText>
                        <View style={styles.list}>
                            {allEnvs.map(env => {
                                const active = selectedEnvIds.has(env.id);
                                if (active) {
                                    return (
                                        <LinearGradient
                                            key={env.id}
                                            colors={GRADIENT}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.envGradientBorder}
                                        >
                                            <TouchableOpacity
                                                style={[styles.envInner, { backgroundColor: theme.surface }]}
                                                onPress={() => toggleEnv(env.id)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.envIconBox, { backgroundColor: `${Cyan[500]}20` }]}>
                                                    <Ionicons name={env.icon} size={22} color={Cyan[400]} />
                                                </View>
                                                <View style={styles.envText}>
                                                    <JempText type="body-l" color={theme.text}>{t(`environment.${env.slug}` as any)}</JempText>
                                                    <JempText type="caption" color={theme.textMuted}>{t(`environment.${env.slug}_description` as any)}</JempText>
                                                </View>
                                                <Ionicons name="checkmark-circle" size={20} color={Cyan[400]} />
                                            </TouchableOpacity>
                                        </LinearGradient>
                                    );
                                }
                                return (
                                    <TouchableOpacity
                                        key={env.id}
                                        style={[styles.envCard, { backgroundColor: theme.surface, borderColor: theme.background }]}
                                        onPress={() => toggleEnv(env.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.envIconBox, { backgroundColor: theme.background }]}>
                                            <Ionicons name={env.icon} size={22} color={theme.textMuted} />
                                        </View>
                                        <View style={styles.envText}>
                                            <JempText type="body-l" color={theme.text}>{t(`environment.${env.slug}` as any)}</JempText>
                                            <JempText type="caption" color={theme.textMuted}>{t(`environment.${env.slug}_description` as any)}</JempText>
                                        </View>
                                        <View style={[styles.emptyCheck, { borderColor: theme.borderStrong }]} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                ) : (
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <JempText type="h1" color={theme.text} style={styles.bodyTitle}>Equipment</JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            Wähle das Equipment das du zur Verfügung hast — oder wähle ab, was du nicht hast.
                        </JempText>
                        <View style={styles.grid}>
                            {allEquipment.map(eq => {
                                const active = selectedEquipmentIds.has(eq.id);
                                if (active) {
                                    return (
                                        <TouchableOpacity
                                            key={eq.id}
                                            onPress={() => toggleEquipment(eq.id)}
                                            activeOpacity={0.7}
                                        >
                                            <LinearGradient
                                                colors={GRADIENT}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.chipGradientBorder}
                                            >
                                                <View style={[styles.chipInner, { backgroundColor: theme.surface }]}>
                                                    <JempText type="caption" color={Cyan[400]} style={styles.chipText}>
                                                        {t(`equipment.${eq.slug}` as any)}
                                                    </JempText>
                                                </View>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    );
                                }
                                return (
                                    <TouchableOpacity
                                        key={eq.id}
                                        style={[styles.chip, { backgroundColor: theme.surface }]}
                                        onPress={() => toggleEquipment(eq.id)}
                                        activeOpacity={0.7}
                                    >
                                        <JempText type="caption" color={theme.textMuted} style={styles.chipText}>
                                            {t(`equipment.${eq.slug}` as any)}
                                        </JempText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    headerRight: { width: 24 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    actionBtn: { fontWeight: '600' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 0 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },

    // Environment cards
    list: { gap: 12 },
    envGradientBorder: {
        borderRadius: 16,
        padding: 1.5,
    },
    envInner: {
        borderRadius: 14.5,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    envCard: {
        borderRadius: 16,
        borderWidth: 1.5,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    envIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    envText: { flex: 1, gap: 2 },
    emptyCheck: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
    },

    // Equipment chips
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipGradientBorder: {
        borderRadius: 20,
        padding: 1.5,
    },
    chipInner: {
        borderRadius: 18.5,
        paddingVertical: 7.5,
        paddingHorizontal: 14.5,
    },
    chip: {
        borderRadius: 20,
        paddingVertical: 9,
        paddingHorizontal: 16,
    },
    chipText: { fontSize: 14, fontWeight: '500' },
});
