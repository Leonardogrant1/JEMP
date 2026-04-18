import Google from '@/assets/icons/google.svg';
import { JempText } from '@/components/jemp-text';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
    visible: boolean;
    onClose: () => void;
};

export function AuthModal({ visible, onClose }: Props) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const insets = useSafeAreaInsets();

    const translateY = useSharedValue(600);
    const overlayOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            overlayOpacity.value = withTiming(1, { duration: 220 });
            translateY.value = withTiming(0, { duration: 280 });
        }
    }, [visible]);

    function handleClose() {
        overlayOpacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(600, { duration: 240 }, () => {
            runOnJS(onClose)();
        });
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    const styles = createStyles(theme);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <View style={StyleSheet.absoluteFill}>
                <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]} />
                <Pressable style={{ flex: 1 }} onPress={handleClose} />

                <Animated.View style={[styles.sheet, sheetStyle, { paddingBottom: insets.bottom + 12 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <JempText type="h1">Sign In</JempText>
                        <Pressable style={styles.closeButton} onPress={handleClose}>
                            <Ionicons name="close" size={20} color={theme.background} />
                        </Pressable>
                    </View>
                    <View style={styles.divider} />

                    {/* Buttons */}
                    <View style={styles.body}>
                        <Pressable style={styles.appleBtn}>
                            <Ionicons name="logo-apple" size={20} color={theme.background} />
                            <Text style={styles.appleBtnText}>Continue with Apple</Text>
                        </Pressable>

                        <Pressable style={styles.socialBtn}>
                            <Google width={20} height={20} />
                            <JempText type="button" color={theme.text}>Continue with Google</JempText>
                        </Pressable>

                        <Pressable style={styles.socialBtn}>
                            <Ionicons name="mail-outline" size={20} color={theme.textMuted} />
                            <JempText type="button" color={theme.text}>Continue with Email</JempText>
                        </Pressable>
                    </View>

                    {/* Legal */}
                    <Text style={styles.legal}>
                        {'By continuing you agree to the '}
                        <Text style={styles.legalLink}>Terms of service</Text>
                        {'\nand '}
                        <Text style={styles.legalLink}>Privacy Policy</Text>
                        {' of Jemp.'}
                    </Text>
                </Animated.View>
            </View>
        </Modal>
    );
}

function createStyles(theme: (typeof Colors)['dark']) {
    return StyleSheet.create({
        overlay: {
            backgroundColor: 'rgba(0,0,0,0.6)',
        },
        sheet: {
            backgroundColor: theme.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
        },
        header: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 22,
            position: 'relative',
        },
        closeButton: {
            position: 'absolute',
            right: 20,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        divider: {
            height: 1,
            backgroundColor: theme.borderDivider,
        },
        body: {
            padding: 20,
            gap: 12,
        },
        appleBtn: {
            height: 56,
            backgroundColor: '#fff',
            borderRadius: 100,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
        },
        appleBtnText: {
            fontSize: 14,
            fontFamily: Fonts.satoshiBold,
            color: '#000',
            letterSpacing: 0.5,
        },
        socialBtn: {
            height: 56,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: theme.borderStrong,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
        },
        legal: {
            fontSize: 12,
            fontFamily: Fonts.satoshiRegular,
            color: theme.textSubtle,
            textAlign: 'center',
            lineHeight: 18,
            paddingHorizontal: 32,
            paddingTop: 4,
        },
        legalLink: {
            fontFamily: Fonts.satoshiBold,
            color: theme.textMuted,
        },
    });
}
