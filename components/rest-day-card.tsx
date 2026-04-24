import { Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { JempText } from './jemp-text';

function GradientMoonIcon({ size = 42 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 512 512">
            <Defs>
                <SvgLinearGradient id="moon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0" stopColor={Cyan[500]} />
                    <Stop offset="1" stopColor={Electric[500]} />
                </SvgLinearGradient>
            </Defs>
            <Path
                d="M160 136c0-30.62 4.51-61.61 16-88C99.57 81.27 48 159.32 48 248c0 119.29 96.71 216 216 216 88.68 0 166.73-51.57 200-128-26.39 11.49-57.38 16-88 16-119.29 0-216-96.71-216-216z"
                fill="url(#moon-grad)"
            />
        </Svg>
    );
}

export function RestDayCard() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.root}>
            <GradientMoonIcon size={42} />
            <JempText type="body-l" color={theme.textMuted}>{t('ui.rest_day')}</JempText>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
});
