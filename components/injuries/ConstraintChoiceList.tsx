import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ConfirmedChoice, ExtractionProposal } from '@/lib/injury-constraints';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

type Tag = { id: string; slug: string };

type Props = {
    proposals: ExtractionProposal[];
    unmapped: string[];
    scheduling: string[];
    allTags: Tag[];
    onChange: (choices: ConfirmedChoice[]) => void;
};

type Mode = 'block' | 'light_only' | 'ok';
const ACUTE_AMBER = '#f59e0b';

/**
 * Pro-Constraint 3-Wege-Auswahl (Vermeiden / Nur leicht / Ist ok). Shared
 * zwischen dem Onboarding-Confirm-Step und dem Rest-Gate-Sheet (Task 5) —
 * daher reiner Presentational-State nach oben via onChange, keine eigene
 * Persistenz.
 */
export function ConstraintChoiceList({ proposals, unmapped, scheduling, allTags, onChange }: Props) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    // tag_slug -> bestätigte Wahl. Vorausgewählte Proposals seeden die Map;
    // manuelle unmapped-Zuordnungen schreiben per tag_slug in dieselbe Map.
    const [choices, setChoices] = useState<Record<string, ConfirmedChoice>>(() => {
        const seeded: Record<string, ConfirmedChoice> = {};
        proposals.forEach((p) => {
            seeded[p.tag_slug] = { tag_slug: p.tag_slug, mode: p.acute ? 'block' : p.mode, acute: p.acute };
        });
        return seeded;
    });
    // unmapped-Index -> manuell zugeordneter tag_slug
    const [unmappedAssignments, setUnmappedAssignments] = useState<Record<number, string>>({});

    // Der seed-State oben ist, was der User BEREITS sieht (vorausgewählte
    // Chips, inkl. Akut-"Vermeiden"). Ohne diesen Mount-Effekt kennt der
    // Parent nur Choices, die aus einem onPress stammen — tippt der User
    // direkt auf Continue, kommt bei confirmInjuryConstraints eine leere
    // Liste an und der sichtbare Default (insbesondere der Akut-Schutz)
    // geht stillschweigend verloren. hasEmittedInitialRef schützt davor,
    // dass ein doppelter Effect-Run (React-18-Dev-StrictMode/Fast-Refresh)
    // den Parent zweimal mit demselben Snapshot aufruft.
    const hasEmittedInitialRef = useRef(false);
    useEffect(() => {
        if (hasEmittedInitialRef.current) return;
        hasEmittedInitialRef.current = true;
        onChange(Object.values(choices));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function emit(next: Record<string, ConfirmedChoice>) {
        setChoices(next);
        onChange(Object.values(next));
    }

    function setMode(tagSlug: string, acute: boolean, mode: Mode) {
        emit({ ...choices, [tagSlug]: { tag_slug: tagSlug, mode, acute } });
    }

    function assignTag(index: number, tagSlug: string) {
        setUnmappedAssignments((prev) => ({ ...prev, [index]: tagSlug }));
        emit({ ...choices, [tagSlug]: { tag_slug: tagSlug, mode: 'block', acute: false } });
    }

    function tagLabel(slug: string): string {
        return t(`injuries.tag_${slug}` as any) as unknown as string;
    }

    const isEmpty = proposals.length === 0 && unmapped.length === 0 && scheduling.length === 0;
    if (isEmpty) {
        return (
            <JempText type="body-l" color={theme.textMuted}>
                {t('injuries.none_option')}
            </JempText>
        );
    }

    return (
        <View style={styles.container}>
            {proposals.map((p) => {
                const current = choices[p.tag_slug]?.mode ?? p.mode;
                return (
                    <View key={p.tag_slug} style={[styles.card, { backgroundColor: theme.surface }]}>
                        <JempText type="body-sm" color={theme.textMuted} style={styles.reason}>
                            {t('injuries.constraint_understood', { reason: p.reason })}
                        </JempText>
                        <JempText type="body-l" style={styles.tagLabel}>
                            {tagLabel(p.tag_slug)}
                        </JempText>
                        {p.acute && (
                            <View style={[styles.acuteBanner, { backgroundColor: `${ACUTE_AMBER}1a`, borderColor: ACUTE_AMBER }]}>
                                <JempText type="caption" color={ACUTE_AMBER} style={styles.acuteTitle}>
                                    {t('injuries.acute_title')}
                                </JempText>
                                <JempText type="body-sm" color={theme.textMuted}>
                                    {t('injuries.acute_body')}
                                </JempText>
                            </View>
                        )}
                        <View style={styles.chipRow}>
                            <SelectableChip
                                label={t('injuries.choice_block')}
                                selected={current === 'block'}
                                color="#ef4444"
                                size="sm"
                                onPress={() => setMode(p.tag_slug, p.acute, 'block')}
                            />
                            <SelectableChip
                                label={t('injuries.choice_light')}
                                selected={current === 'light_only'}
                                color={ACUTE_AMBER}
                                size="sm"
                                onPress={() => setMode(p.tag_slug, p.acute, 'light_only')}
                            />
                            <SelectableChip
                                label={t('injuries.choice_ok')}
                                selected={current === 'ok'}
                                color="#22c55e"
                                size="sm"
                                onPress={() => setMode(p.tag_slug, p.acute, 'ok')}
                            />
                        </View>
                    </View>
                );
            })}

            {unmapped.length > 0 && (
                <View style={styles.section}>
                    <JempText type="body-l" style={styles.sectionTitle}>
                        {t('injuries.unmapped_title')}
                    </JempText>
                    {unmapped.map((text, index) => {
                        const assignedSlug = unmappedAssignments[index];
                        const current = assignedSlug ? choices[assignedSlug]?.mode : undefined;
                        return (
                            <View key={`${text}-${index}`} style={[styles.card, { backgroundColor: theme.surface }]}>
                                <JempText type="body-sm" color={theme.textMuted} style={styles.reason}>
                                    {text}
                                </JempText>
                                <JempText type="caption" color={theme.textSubtle} style={styles.assignLabel}>
                                    {t('injuries.unmapped_assign').toUpperCase()}
                                </JempText>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
                                    {allTags.map((tag) => (
                                        <SelectableChip
                                            key={tag.id}
                                            label={tagLabel(tag.slug)}
                                            selected={assignedSlug === tag.slug}
                                            size="sm"
                                            onPress={() => assignTag(index, tag.slug)}
                                        />
                                    ))}
                                </ScrollView>
                                {assignedSlug && (
                                    <View style={styles.chipRow}>
                                        <SelectableChip
                                            label={t('injuries.choice_block')}
                                            selected={current === 'block'}
                                            color="#ef4444"
                                            size="sm"
                                            onPress={() => setMode(assignedSlug, false, 'block')}
                                        />
                                        <SelectableChip
                                            label={t('injuries.choice_light')}
                                            selected={current === 'light_only'}
                                            color={ACUTE_AMBER}
                                            size="sm"
                                            onPress={() => setMode(assignedSlug, false, 'light_only')}
                                        />
                                        <SelectableChip
                                            label={t('injuries.choice_ok')}
                                            selected={current === 'ok'}
                                            color="#22c55e"
                                            size="sm"
                                            onPress={() => setMode(assignedSlug, false, 'ok')}
                                        />
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}

            {scheduling.length > 0 && (
                <View style={styles.section}>
                    {scheduling.map((text, index) => (
                        <JempText key={`${text}-${index}`} type="body-sm" color={theme.textMuted} style={styles.schedulingItem}>
                            {`"${text}"`}
                        </JempText>
                    ))}
                    <JempText type="caption" color={theme.textSubtle} style={styles.schedulingHint}>
                        {t('injuries.scheduling_redirect')}
                    </JempText>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 16 },
    card: {
        borderRadius: 16,
        padding: 16,
        gap: 10,
    },
    reason: { lineHeight: 18 },
    tagLabel: { fontWeight: '600' as const },
    acuteBanner: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        gap: 4,
    },
    acuteTitle: { letterSpacing: 0.6, fontWeight: '700' as const },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    section: { gap: 10 },
    sectionTitle: { marginBottom: 2 },
    assignLabel: { letterSpacing: 0.8, fontSize: 10 },
    tagScroll: { gap: 8, paddingRight: 8 },
    schedulingItem: { fontStyle: 'italic' as const, lineHeight: 18 },
    schedulingHint: { lineHeight: 16 },
});
