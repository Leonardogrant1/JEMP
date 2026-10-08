import { JempText } from '@/components/jemp-text';
import { SprintContextForm } from '@/components/pillars/sprint-context-form';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export function SprintContextStep() {
    const { t } = useTranslation();
    const { sprintClub, sprintClubAnswered, sprintDistance, setSprintClub, setSprintDistance } = usePlanWizardStore();

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" style={styles.title}>{t('sprint_context.title')}</JempText>
            <SprintContextForm
                club={sprintClub}
                clubAnswered={sprintClubAnswered}
                distance={sprintDistance}
                onClub={setSprintClub}
                onDistance={setSprintDistance}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
    title: { marginBottom: 24 },
});
