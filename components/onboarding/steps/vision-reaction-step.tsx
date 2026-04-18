import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors, Fonts } from '@/constants/theme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import * as StoreReview from 'expo-store-review';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type OptionId = 'want_it' | 'wild' | 'good' | 'not_yet';

export function VisionReactionStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const [selected, setSelected] = useState<OptionId | null>(null);

    const OPTIONS: { id: OptionId; label: string }[] = [
        { id: 'want_it', label: t('onboarding.reaction.want_it') },
        { id: 'wild', label: t('onboarding.reaction.wild') },
        { id: 'good', label: t('onboarding.reaction.good') },
        { id: 'not_yet', label: t('onboarding.reaction.not_yet') },
    ];

    const POSITIVE: OptionId[] = ['want_it', 'wild', 'good'];

    function handleSelect(id: OptionId) {
        setSelected(id);
        setCanContinue(true);
        trackerManager.track('onboarding_reaction_selected', { reaction: id });
        if (POSITIVE.includes(id)) {
            StoreReview.isAvailableAsync().then((available) => {
                if (available) StoreReview.requestReview();
            }).catch(() => { });
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.inner}>
                <Text style={styles.headline}>{t('onboarding.reaction.headline')}</Text>
                <View style={styles.options}>
                    {OPTIONS.map((opt) => {
                        const isSelected = selected === opt.id;
                        return (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.option, isSelected && styles.optionSelected]}
                                onPress={() => handleSelect(opt.id)}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        gap: 32,
    },
    headline: {
        fontFamily: Fonts.serifBold,
        fontSize: 40,
        lineHeight: 50,
        color: Colors.textHeadline,
    },
    options: {
        gap: 12,
    },
    option: {
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(26,26,26,0.15)',
        paddingVertical: 18,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    optionSelected: {
        borderColor: '#1a1a1a',
        backgroundColor: '#1a1a1a',
    },
    optionText: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 16,
        color: Colors.textHeadline,
    },
    optionTextSelected: {
        color: 'white',
    },
});
