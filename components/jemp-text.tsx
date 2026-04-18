import { Colors, Cyan, Electric, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';
import { StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

type TextType = 'hero' | 'h1' | 'h2' | 'body-l' | 'body-sm' | 'caption' | 'button';

const typeStyles: Record<TextType, { fontSize: number; fontFamily: string; lineHeight: number; letterSpacing: number }> = {
    hero:      { fontSize: 34, fontFamily: Fonts.satoshiBlack,   lineHeight: 40, letterSpacing: -0.5 },
    h1:        { fontSize: 28, fontFamily: Fonts.satoshiBold,    lineHeight: 34, letterSpacing: -0.3 },
    h2:        { fontSize: 22, fontFamily: Fonts.satoshiMedium,  lineHeight: 28, letterSpacing: -0.2 },
    'body-l':  { fontSize: 16, fontFamily: Fonts.satoshiRegular, lineHeight: 24, letterSpacing: 0.1  },
    'body-sm': { fontSize: 14, fontFamily: Fonts.satoshiRegular, lineHeight: 20, letterSpacing: 0.1  },
    caption:   { fontSize: 12, fontFamily: Fonts.satoshiRegular, lineHeight: 16, letterSpacing: 0.3  },
    button:    { fontSize: 14, fontFamily: Fonts.satoshiBold,    lineHeight: 20, letterSpacing: 0.5  },
};

const defaultColor = (type: TextType, theme: typeof Colors.light): string => {
    if (type === 'hero' || type === 'h1' || type === 'h2') return theme.textHeadline;
    if (type === 'caption') return theme.textMuted;
    return theme.text;
};

type JempTextProps = TextProps & {
    type: TextType;
    color?: string;
    gradient?: boolean;
};

export function JempText({ type, color, gradient, style, children, ...props }: JempTextProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const ts = typeStyles[type];

    const [width, setWidth] = useState(0);

    if (gradient) {
        return (
            <View style={[{ alignSelf: 'flex-start' }, style as ViewStyle]}>
                {/* Unsichtbarer Text, um das Layout / die Breite zu berechnen */}
                <Text
                    onLayout={e => setWidth(e.nativeEvent.layout.width)}
                    style={[ts, { opacity: 0 }]}
                    {...props}
                >
                    {children}
                </Text>

                {/* Sobald die Breite da ist, zeichnen wir das absolute SVG drüber */}
                {width > 0 && (
                    <View style={StyleSheet.absoluteFill}>
                        <Svg width="100%" height="100%">
                            <Defs>
                                <LinearGradient id="jemp-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <Stop offset="0" stopColor={Cyan[500]} />
                                    <Stop offset="1" stopColor={Electric[500]} />
                                </LinearGradient>
                            </Defs>
                            <SvgText
                                fill="url(#jemp-grad)"
                                fontSize={ts.fontSize}
                                fontFamily={ts.fontFamily}
                                letterSpacing={ts.letterSpacing}
                                x="0"
                                y={ts.fontSize} // Ausrichtung auf die Baseline
                            >
                                {children as string}
                            </SvgText>
                        </Svg>
                    </View>
                )}
            </View>
        );
    }

    return (
        <Text
            style={[ts, { color: color ?? defaultColor(type, theme) }, style]}
            {...props}
        >
            {children}
        </Text>
    );
}
