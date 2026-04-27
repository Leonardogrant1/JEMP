import { Colors, Fonts, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';

type JempInputProps = TextInputProps & {
    variant?: 'card' | 'outlined';
};

export const JempInput = forwardRef<TextInput, JempInputProps>(function JempInput({ variant = 'card', style, onFocus, onBlur, ...props }, ref) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const [focused, setFocused] = useState(false);

    const variantStyle = variant === 'outlined'
        ? {
            backgroundColor: theme.background,
            borderColor: theme.borderDivider,
            color: theme.text,
          }
        : {
            backgroundColor: theme.surface,
            borderColor: focused ? GradientMid : theme.borderCard,
            color: theme.text,
          };

    return (
        <TextInput
            ref={ref}
            placeholderTextColor={props.placeholderTextColor ?? theme.textPlaceholder}
            selectionColor={theme.text}
            style={[
                styles.base,
                variant === 'outlined' ? styles.outlined : styles.card,
                variantStyle,
                style,
            ]}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            {...props}
        />
    );
});

const styles = StyleSheet.create({
    base: {
        fontFamily: Fonts.satoshiMedium,
        fontSize: 15,
    },
    card: {
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 18,
        paddingHorizontal: 16,
        fontSize: 18,
    },
    outlined: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
});
