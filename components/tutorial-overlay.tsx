// import LottieView from 'lottie-react-native';
// import { useEffect, useRef } from 'react';
// import { useTranslation } from 'react-i18next';
// import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// import Logo from '@/assets/logo.svg';
// import { Colors, Fonts } from '@/constants/theme';
// import { useTutorial } from '@/contexts/TutorialContext';

// // Steps 1–6 translation key prefixes
// const CARD_STEP_KEYS: Record<number, string> = {
//     1: 'tutorial.step1',
//     2: 'tutorial.step2',
//     3: 'tutorial.step3',
//     4: 'tutorial.step4',
//     5: 'tutorial.step5',
//     6: 'tutorial.step6',
// };

// // Reusable stagger animation
// function useStaggerAnims(count: number) {
//     const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;

//     function play() {
//         anims.forEach((a) => a.setValue(0));
//         Animated.stagger(
//             110,
//             anims.map((a) => Animated.timing(a, { toValue: 1, duration: 450, useNativeDriver: true }))
//         ).start();
//     }

//     return { anims, play };
// }

// function animStyle(anim: Animated.Value, offset = 20) {
//     return {
//         opacity: anim,
//         transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
//     };
// }

// // ─── Full-screen overlay steps ────────────────────────────────────────────────

// function WelcomeStep({ nextStep }: { nextStep: () => void }) {
//     const { anims, play } = useStaggerAnims(4);
//     const { t } = useTranslation();
//     useEffect(() => { play(); }, []);

//     return (
//         <View style={styles.fullScreen}>
//             <Animated.View style={animStyle(anims[0])}>
//                 <Logo width={80} height={80} />
//             </Animated.View>
//             <Animated.Text style={[styles.fullTitle, animStyle(anims[1])]}>
//                 {t('tutorial.welcome.title')}
//             </Animated.Text>
//             <Animated.Text style={[styles.fullBody, animStyle(anims[2])]}>
//                 {t('tutorial.welcome.body')}
//             </Animated.Text>
//             <Animated.View style={animStyle(anims[3])}>
//                 <TouchableOpacity style={styles.ctaButton} onPress={nextStep} activeOpacity={0.85}>
//                     <Text style={styles.ctaText}>{t('tutorial.welcome.cta')}</Text>
//                 </TouchableOpacity>
//             </Animated.View>
//         </View>
//     );
// }

// function NotificationsStep({ nextStep }: { nextStep: () => void }) {
//     const { anims, play } = useStaggerAnims(4);
//     const { t } = useTranslation();
//     useEffect(() => { play(); }, []);

//     return (
//         <View style={styles.fullScreen}>
//             <Animated.View style={animStyle(anims[0])}>
//                 <LottieView
//                     source={require('@/assets/animations/notifications.json')}
//                     autoPlay
//                     loop={false}
//                     style={styles.lottie}
//                 />
//             </Animated.View>
//             <Animated.Text style={[styles.fullTitle, animStyle(anims[1])]}>
//                 {t('tutorial.notifications.title')}
//             </Animated.Text>
//             <Animated.Text style={[styles.fullBody, animStyle(anims[2])]}>
//                 {t('tutorial.notifications.body')}
//             </Animated.Text>
//             <Animated.View style={animStyle(anims[3])}>
//                 <TouchableOpacity style={styles.ctaButton} onPress={nextStep} activeOpacity={0.85}>
//                     <Text style={styles.ctaText}>{t('tutorial.notifications.cta')}</Text>
//                 </TouchableOpacity>
//             </Animated.View>
//         </View>
//     );
// }

// function WidgetStep({ nextStep }: { nextStep: () => void }) {
//     const { anims, play } = useStaggerAnims(4);
//     const { t } = useTranslation();
//     useEffect(() => { play(); }, []);

//     return (
//         <View style={styles.fullScreen}>
//             <Animated.View style={animStyle(anims[0])}>
//                 <LottieView
//                     source={require('@/assets/animations/widget.json')}
//                     autoPlay
//                     loop={false}
//                     style={styles.lottieWide}
//                 />
//             </Animated.View>
//             <Animated.Text style={[styles.fullTitle, animStyle(anims[1])]}>
//                 {t('tutorial.widget.title')}
//             </Animated.Text>
//             <Animated.Text style={[styles.fullBody, animStyle(anims[2])]}>
//                 {t('tutorial.widget.body')}
//             </Animated.Text>
//             <Animated.View style={animStyle(anims[3])}>
//                 <TouchableOpacity style={styles.ctaButton} onPress={nextStep} activeOpacity={0.85}>
//                     <Text style={styles.ctaText}>{t('tutorial.widget.cta')}</Text>
//                 </TouchableOpacity>
//             </Animated.View>
//         </View>
//     );
// }

// function ReadyStep({ nextStep }: { nextStep: () => void }) {
//     const { anims, play } = useStaggerAnims(3);
//     const { t } = useTranslation();
//     useEffect(() => { play(); }, []);

//     return (
//         <View style={styles.fullScreen}>
//             <Animated.Text style={[styles.readyTitle, animStyle(anims[0])]}>
//                 {t('tutorial.ready.title')}
//             </Animated.Text>
//             <Animated.Text style={[styles.fullBody, animStyle(anims[1])]}>
//                 {t('tutorial.ready.body')}
//             </Animated.Text>
//             <Animated.View style={animStyle(anims[2])}>
//                 <TouchableOpacity style={styles.ctaButtonLarge} onPress={nextStep} activeOpacity={0.85}>
//                     <Text style={styles.ctaTextLarge}>{t('tutorial.ready.cta')}</Text>
//                 </TouchableOpacity>
//             </Animated.View>
//         </View>
//     );
// }

// // ─── Animated tooltip card (steps 1–6) ────────────────────────────────────────

// function TooltipCard({ step, nextStep }: { step: number; nextStep: () => void }) {
//     const insets = useSafeAreaInsets();
//     const { t } = useTranslation();
//     const prefix = CARD_STEP_KEYS[step];

//     const cardAnim = useRef(new Animated.Value(0)).current;

//     useEffect(() => {
//         cardAnim.setValue(0);
//         Animated.timing(cardAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
//     }, [step]);

//     if (!prefix) return null;

//     const totalSteps = 9;
//     return (
//         <Animated.View
//             style={[
//                 styles.cardContainer,
//                 { top: insets.top + 60, left: 16, right: 16 },
//                 {
//                     opacity: cardAnim,
//                     transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
//                 },
//             ]}
//             pointerEvents="box-none"
//         >
//             <View style={styles.card}>
//                 <View style={styles.dotsRow}>
//                     {Array.from({ length: totalSteps - 1 }, (_, i) => (
//                         <View key={i} style={[styles.dot, i + 1 === step && styles.dotActive]} />
//                     ))}
//                 </View>
//                 <Text style={styles.cardTitle}>{t(`${prefix}.title` as any)}</Text>
//                 <Text style={styles.cardBody}>{t(`${prefix}.body` as any)}</Text>
//                 <TouchableOpacity style={[styles.ctaButton, styles.ctaButtonCard]} onPress={nextStep} activeOpacity={0.85}>
//                     <Text style={styles.ctaText}>{t(`${prefix}.cta` as any)}</Text>
//                 </TouchableOpacity>
//             </View>
//         </Animated.View>
//     );
// }

// // ─── Main overlay ─────────────────────────────────────────────────────────────

// export function TutorialOverlay() {
//     const { step, nextStep } = useTutorial();

//     const isFullScreen = [0, 7, 8, 9].includes(step);
//     const backdropOpacity = isFullScreen ? 0.92 : 0.72;

//     return (
//         <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
//             <View style={[styles.backdrop, { backgroundColor: `rgba(0,0,0,${backdropOpacity})` }]} pointerEvents="none" />

//             {step === 0 && <WelcomeStep nextStep={nextStep} />}
//             {step >= 1 && step <= 6 && <TooltipCard step={step} nextStep={nextStep} />}
//             {step === 7 && <NotificationsStep nextStep={nextStep} />}
//             {step === 8 && <WidgetStep nextStep={nextStep} />}
//             {step === 9 && <ReadyStep nextStep={nextStep} />}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     backdrop: {
//         ...StyleSheet.absoluteFillObject,
//         zIndex: 10,
//     },
//     // Full-screen steps
//     fullScreen: {
//         ...StyleSheet.absoluteFillObject,
//         zIndex: 25,
//         justifyContent: 'center',
//         alignItems: 'center',
//         paddingHorizontal: 36,
//         gap: 18,
//     },
//     fullTitle: {
//         color: 'white',
//         fontFamily: Fonts.serifBold,
//         fontSize: 26,
//         textAlign: 'center',
//     },
//     readyTitle: {
//         color: 'white',
//         fontFamily: Fonts.serifBold,
//         fontSize: 36,
//         textAlign: 'center',
//     },
//     fullBody: {
//         color: 'rgba(255,255,255,0.75)',
//         fontFamily: Fonts.sans,
//         fontSize: 16,
//         textAlign: 'center',
//         lineHeight: 24,
//     },
//     lottie: {
//         width: 280,
//         height: 160,
//     },
//     lottieWide: {
//         width: 340,
//         height: 220,
//     },
//     // CTA buttons
//     ctaButtonCard: {
//         alignSelf: 'flex-start',
//         paddingHorizontal: 28,
//         paddingVertical: 10,
//         marginTop: 2,
//     },
//     ctaButton: {
//         backgroundColor: Colors.accent,
//         paddingHorizontal: 40,
//         paddingVertical: 14,
//         borderRadius: 999,
//         marginTop: 4,
//     },
//     ctaText: {
//         color: 'white',
//         fontFamily: Fonts.sansBold,
//         fontSize: 16,
//     },
//     ctaButtonLarge: {
//         backgroundColor: Colors.accent,
//         paddingHorizontal: 48,
//         paddingVertical: 16,
//         borderRadius: 999,
//         marginTop: 4,
//     },
//     ctaTextLarge: {
//         color: 'white',
//         fontFamily: Fonts.sansBold,
//         fontSize: 17,
//     },
//     // Tooltip card
//     cardContainer: {
//         position: 'absolute',
//         zIndex: 25,
//     },
//     card: {
//         backgroundColor: Colors.surface,
//         borderRadius: 20,
//         paddingHorizontal: 20,
//         paddingVertical: 20,
//         borderWidth: 1,
//         borderColor: Colors.borderCard,
//         gap: 10,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 8 },
//         shadowOpacity: 0.35,
//         shadowRadius: 16,
//         elevation: 12,
//     },
//     dotsRow: {
//         flexDirection: 'row',
//         gap: 5,
//         marginBottom: 2,
//     },
//     dot: {
//         width: 5,
//         height: 5,
//         borderRadius: 3,
//         backgroundColor: Colors.borderDivider,
//     },
//     dotActive: {
//         backgroundColor: Colors.accent,
//         width: 14,
//     },
//     cardTitle: {
//         fontFamily: Fonts.serifBold,
//         fontSize: 18,
//         color: Colors.textHeadline,
//     },
//     cardBody: {
//         fontFamily: Fonts.sans,
//         fontSize: 14,
//         color: Colors.text,
//         lineHeight: 21,
//     },
// });
