import { JempText } from '@/components/jemp-text';
import { EnvironmentCard } from '@/components/ui/environment-card';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/services/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Modal, Pressable, ScrollView,
    StyleSheet,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

const ENV_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    gym: 'barbell-outline',
    outdoor: 'leaf-outline',
    home: 'home-outline',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'environment' | 'equipment';
type EnvItem = { id: string; slug: string; icon: keyof typeof Ionicons.glyphMap; name_i18n: Record<string, string> | null; description_i18n: Record<string, string> | null };
type EquipmentItem = { id: string; slug: string; name_i18n: Record<string, string> | null };

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
    const { i18n } = useTranslation();
    const locale = i18n.language;

    const [phase, setPhase] = useState<Phase>('environment');
    const [allEnvs, setAllEnvs] = useState<EnvItem[]>([]);
    const [selectedEnvIds, setSelectedEnvIds] = useState<Set<string>>(new Set());
    const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [equipmentByEnv, setEquipmentByEnv] = useState<Map<string, EquipmentItem[]>>(new Map());

    useEffect(() => {
        if (!visible) return;
        setPhase('environment');
        setLoading(true);

        Promise.all([
            supabase.from('environments').select('id, slug, name_i18n, description_i18n'),
            supabase.from('user_equipments').select('equipment_id').eq('user_id', userId),
            supabase.from('environment_equipments').select('environment_id, equipment:equipments(id, slug, name_i18n)'),
            supabase.from('user_environments').select('environment_id').eq('user_id', userId),
        ]).then(([envsRes, userEquipRes, envEqRes, userEnvsRes]) => {
            const currentEquipmentIds = new Set((userEquipRes.data ?? []).map(r => r.equipment_id));
            setSelectedEquipmentIds(currentEquipmentIds);

            const byEnv = new Map<string, EquipmentItem[]>();
            for (const row of envEqRes.data ?? []) {
                const eq = (row.equipment as any);
                if (!eq) continue;
                if (!byEnv.has(row.environment_id)) byEnv.set(row.environment_id, []);
                byEnv.get(row.environment_id)!.push({ id: eq.id, slug: eq.slug, name_i18n: eq.name_i18n as Record<string, string> | null });
            }
            setEquipmentByEnv(byEnv);

            if (envsRes.data) {
                const envItems: EnvItem[] = envsRes.data.map(e => ({
                    id: e.id,
                    slug: e.slug,
                    icon: ENV_ICONS[e.slug] ?? 'location-outline',
                    name_i18n: e.name_i18n as Record<string, string> | null,
                    description_i18n: e.description_i18n as Record<string, string> | null,
                }));
                setAllEnvs(envItems);
                setSelectedEnvIds(new Set((userEnvsRes.data ?? []).map(r => r.environment_id)));
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
        await Promise.all([
            supabase.from('user_environments').delete().eq('user_id', userId),
            supabase.from('user_equipments').delete().eq('user_id', userId),
        ]);
        const inserts: Promise<any>[] = [];
        if (selectedEnvIds.size > 0) {
            inserts.push(supabase.from('user_environments').insert(
                [...selectedEnvIds].map(environment_id => ({ user_id: userId, environment_id }))
            ));
        }
        if (selectedEquipmentIds.size > 0) {
            inserts.push(supabase.from('user_equipments').insert(
                [...selectedEquipmentIds].map(equipment_id => ({ user_id: userId, equipment_id }))
            ));
        }
        await Promise.all(inserts);
        setSaving(false);
        onClose();
    }

    const canProceed = phase === 'environment' ? selectedEnvIds.size > 0 : true;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <Pressable
                        onPress={phase === 'equipment' ? () => setPhase('environment') : onClose}
                        hitSlop={12}
                        style={styles.headerSide}
                    >
                        <Ionicons
                            name={phase === 'equipment' ? 'chevron-back' : 'close'}
                            size={24}
                            color={theme.text}
                        />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <JempText type="body-l" color={theme.textMuted}>
                            Equipment
                        </JempText>
                        <View style={styles.stepBars}>
                            {(['environment', 'equipment'] as Phase[]).map((p, i) => (
                                <View
                                    key={p}
                                    style={[
                                        styles.stepBar,
                                        { backgroundColor: i <= (['environment', 'equipment'] as Phase[]).indexOf(phase) ? GradientMid : theme.borderStrong },
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                    <View style={styles.headerSide} />
                </View>

                {/* ── Content ── */}
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator color={GradientMid} />
                    </View>
                ) : phase === 'environment' ? (
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <JempText type="h1" color={theme.text} style={styles.title}>Umgebung</JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            Wo trainierst du? Wähle alle zutreffenden Umgebungen.
                        </JempText>
                        <View style={styles.envList}>
                            {allEnvs.map(env => (
                                <EnvironmentCard
                                    key={env.id}
                                    name={env.name_i18n?.[locale] ?? env.slug}
                                    description={env.description_i18n?.[locale]}
                                    icon={env.icon}
                                    selected={selectedEnvIds.has(env.id)}
                                    onPress={() => toggleEnv(env.id)}
                                />
                            ))}
                        </View>
                    </ScrollView>
                ) : (
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <JempText type="h1" color={theme.text} style={styles.title}>Equipment</JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            Wähle das Equipment das du zur Verfügung hast.
                        </JempText>
                        <View style={styles.chipGrid}>
                            {allEquipment.map(eq => (
                                <SelectableChip
                                    key={eq.id}
                                    label={eq.name_i18n?.[locale] ?? eq.slug}
                                    selected={selectedEquipmentIds.has(eq.id)}
                                    onPress={() => toggleEquipment(eq.id)}
                                />
                            ))}
                        </View>
                    </ScrollView>
                )}

                {/* ── Fixed bottom button ── */}
                <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: theme.background }]}>
                    <Pressable
                        onPress={phase === 'equipment' ? save : goToEquipment}
                        disabled={!canProceed || saving}
                        style={styles.bottomBtn}
                    >
                        <LinearGradient
                            colors={canProceed ? GRADIENT : [theme.surface, theme.surface]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.bottomBtnGradient}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <JempText type="button" color={canProceed ? '#fff' : theme.textMuted}>
                                    {phase === 'equipment' ? 'Speichern' : 'Weiter'}
                                </JempText>
                            )}
                        </LinearGradient>
                    </Pressable>
                </View>

            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    headerSide: { width: 24 },
    headerCenter: { flex: 1, alignItems: 'center', gap: 15, paddingHorizontal: 12 },
    stepBars: { flexDirection: 'row', gap: 5 },
    stepBar: { width: 24, height: 3, borderRadius: 2 },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    title: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },

    // Environment
    envList: { gap: 12 },
    envCard: {
        borderRadius: 16,
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

    // Equipment
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

    // Bottom button
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    bottomBtn: { borderRadius: 100, overflow: 'hidden' },
    bottomBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
