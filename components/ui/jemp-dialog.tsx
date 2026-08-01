import { JempText } from '@/components/jemp-text';
import { Colors, GRADIENT } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

type JempDialogProps = {
    visible: boolean;
    title: string;
    message: string;
    buttonLabel: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    animationSource?: ComponentProps<typeof LottieView>['source']; // shown instead of the icon
    onDismiss: () => void;
};

export function JempDialog({ visible, title, message, buttonLabel, icon, iconColor, animationSource, onDismiss }: JempDialogProps) {
    const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark';
    const colors = Colors[scheme];

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
            <Pressable style={styles.backdrop} onPress={onDismiss}>
                <Pressable
                    onPress={e => e.stopPropagation()}
                    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderCard }]}
                >
                    {animationSource ? (
                        <LottieView autoPlay loop={false} source={animationSource} style={styles.animation} />
                    ) : icon ? (
                        <View style={[styles.iconCircle, { backgroundColor: `${iconColor ?? colors.text}20` }]}>
                            <Ionicons name={icon} size={22} color={iconColor ?? colors.text} />
                        </View>
                    ) : null}
                    <JempText type="h2" style={styles.title}>{title}</JempText>
                    <JempText type="body-sm" color={colors.textMuted} style={styles.message}>
                        {message}
                    </JempText>

                    <Pressable onPress={onDismiss} style={styles.buttonWrapper}>
                        <LinearGradient
                            colors={GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.button}
                        >
                            <JempText type="button" color="#fff">{buttonLabel}</JempText>
                        </LinearGradient>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        borderRadius: 14,
        padding: 20,
        borderWidth: 1,
        gap: 8,
        alignItems: 'center',
    },
    animation: {
        width: 90,
        height: 90,
        marginBottom: 4,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    title: { textAlign: 'center' },
    message: { textAlign: 'center', lineHeight: 20 },
    buttonWrapper: { marginTop: 10, alignSelf: 'stretch' },
    button: {
        height: 52,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
