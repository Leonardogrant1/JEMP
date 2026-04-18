import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';

const PLANS = [
    { id: 'weekly', label: 'Wöchentlich', price: '4,99€', period: '/ Woche', highlight: false, badge: null },
    { id: 'monthly', label: 'Monatlich', price: '9,99€', period: '/ Monat', highlight: true, badge: null },
    { id: 'yearly', label: 'Jährlich', price: '39,99€', period: '/ Jahr', highlight: false, badge: 'Bestes Angebot' },
] as const;

export function PaywallStep() {
    const { nextStep } = useOnboardingControl();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Starte deine{'\n'}Transformation</Text>
            <Text style={styles.subtitle}>3 Tage kostenlos. Jederzeit kündbar.</Text>
            <View style={styles.plans}>
                {PLANS.map((plan) => (
                    <TouchableOpacity
                        key={plan.id}
                        style={[styles.plan, plan.highlight && styles.planHighlight]}
                        activeOpacity={0.7}
                        onPress={nextStep}
                    >
                        {plan.badge && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{plan.badge}</Text>
                            </View>
                        )}
                        <Text style={[styles.planLabel, plan.highlight && styles.planLabelHighlight]}>
                            {plan.label}
                        </Text>
                        <Text style={[styles.planPrice, plan.highlight && styles.planPriceHighlight]}>
                            {plan.price}
                        </Text>
                        <Text style={[styles.planPeriod, plan.highlight && styles.planPeriodHighlight]}>
                            {plan.period}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity style={styles.trialButton} onPress={nextStep} activeOpacity={0.85}>
                <Text style={styles.trialButtonText}>3 Tage kostenlos starten</Text>
            </TouchableOpacity>
            <Text style={styles.legal}>Danach 9,99€/Monat. Jederzeit kündbar.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    title: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 36,
        marginBottom: 8,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        marginBottom: 28,
    },
    plans: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    plan: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        gap: 4,
        borderWidth: 1.5,
        borderColor: 'transparent',
        minHeight: 110,
        justifyContent: 'center',
    },
    planHighlight: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    badge: {
        backgroundColor: 'white',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginBottom: 4,
    },
    badgeText: {
        color: '#0d0d0d',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    planLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontWeight: '600',
    },
    planLabelHighlight: {
        color: 'white',
    },
    planPrice: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
    },
    planPriceHighlight: {
        color: 'white',
    },
    planPeriod: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
    },
    planPeriodHighlight: {
        color: 'rgba(255,255,255,0.7)',
    },
    trialButton: {
        backgroundColor: 'white',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    trialButtonText: {
        color: '#0d0d0d',
        fontSize: 16,
        fontWeight: '700',
    },
    legal: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 12,
    },
});
