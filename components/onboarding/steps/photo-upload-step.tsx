import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import body from '@/assets/face-photo-icons/body.svg';
import face_front from '@/assets/face-photo-icons/face_front.svg';
import face_left from '@/assets/face-photo-icons/face_left.svg';
import face_right from '@/assets/face-photo-icons/face_right.svg';
import face_smile from '@/assets/face-photo-icons/face_smile.svg';
import { ImagePickerModal } from '@/components/modals/ImagePickerModal';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors, Fonts } from '@/constants/theme';
import { useUserDataStore } from '@/stores/UserDataStore';
import { SelfReferenceImages } from '@/types/user-data';
import { pickFromCamera, pickFromGallery } from '@/utils/image-picker';

type Slot = keyof SelfReferenceImages;

export function PhotoUploadStep() {
    const { t } = useTranslation();
    const { setCanContinue, setOnDisabledPress } = useOnboardingControl();
    const updateSelfReferenceImages = useUserDataStore((s) => s.updateSelfReferenceImages);
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<import('react-native').ScrollView>(null);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const SLOTS: { key: Slot; label: string; hint: string; wide?: boolean; icon: any }[] = [
        { key: 'face_front', label: t('onboarding.photo_upload.slot_front'), hint: t('onboarding.photo_upload.slot_front_hint'), icon: face_front },
        { key: 'face_smile', label: t('onboarding.photo_upload.slot_smile'), hint: t('onboarding.photo_upload.slot_smile_hint'), icon: face_smile },
        { key: 'face_left', label: t('onboarding.photo_upload.slot_left'), hint: t('onboarding.photo_upload.slot_left_hint'), icon: face_left },
        { key: 'face_right', label: t('onboarding.photo_upload.slot_right'), hint: t('onboarding.photo_upload.slot_right_hint'), icon: face_right },
        { key: 'body', label: t('onboarding.photo_upload.slot_body'), hint: t('onboarding.photo_upload.slot_body_hint'), wide: true, icon: body },
    ];

    const [uris, setUris] = useState<SelfReferenceImages>({
        face_front: null, face_smile: null, face_left: null, face_right: null, body: null,
    });
    const [pickerTarget, setPickerTarget] = useState<Slot | null>(null);
    const [consentGiven, setConsentGiven] = useState(false);
    const consentGivenRef = useRef(false);
    const [aiInfoVisible, setAiInfoVisible] = useState(false);

    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        if (aiInfoVisible) {
            Animated.parallel([
                Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [aiInfoVisible]);

    function closeAiInfo() {
        Animated.parallel([
            Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
        ]).start(() => setAiInfoVisible(false));
    }

    useEffect(() => {
        setCanContinue(Object.values(uris).every(Boolean) && consentGiven);
    }, [uris, consentGiven]);

    useEffect(() => {
        setOnDisabledPress(() => {
            if (consentGivenRef.current) return;
            scrollRef.current?.scrollTo({ y: 0, animated: true });
            setTimeout(() => {
                Animated.sequence([
                    Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
                ]).start();
            }, 300);
        });
    }, []);

    function applyUri(slot: Slot, uri: string) {
        const updated = { ...uris, [slot]: uri };
        setUris(updated);
        updateSelfReferenceImages({ [slot]: uri });
    }

    async function handleCamera(slot: Slot) {
        setPickerTarget(null);
        const uri = await pickFromCamera();
        if (uri) applyUri(slot, uri);
    }

    async function handleGallery(slot: Slot) {
        setPickerTarget(null);
        const uri = await pickFromGallery();
        if (uri) applyUri(slot, uri);
    }

    function removeSlot(slot: Slot) {
        const updated = { ...uris, [slot]: null };
        setUris(updated);
        updateSelfReferenceImages({ [slot]: null });
    }

    return (
        <>
            <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>{t('onboarding.photo_upload.title')}</Text>
                <Text style={styles.subtitle}>{t('onboarding.photo_upload.subtitle')}</Text>

                <TouchableOpacity
                    style={styles.consentRow}
                    onPress={() => setConsentGiven((v) => { consentGivenRef.current = !v; return !v; })}
                    activeOpacity={0.7}
                >
                    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                        <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]}>
                            {consentGiven && <MaterialIcons name="check" size={13} color={Colors.surface} />}
                        </View>
                    </Animated.View>
                    <Text style={styles.consentText}>
                        {t('onboarding.photo_upload.consent_label')}
                        <Text
                            style={styles.consentLink}
                            onPress={(e) => { e.stopPropagation(); setAiInfoVisible(true); }}
                        >
                            {t('onboarding.photo_upload.consent_link')}
                        </Text>
                    </Text>
                </TouchableOpacity>

                <View style={styles.slots}>
                    {SLOTS.map((slot) => {
                        const uri = uris[slot.key];
                        return (
                            <TouchableOpacity
                                key={slot.key}
                                style={[styles.slot, slot.wide && styles.slotWide]}
                                onPress={() => setPickerTarget(slot.key)}
                                activeOpacity={0.8}
                            >
                                {uri ? (
                                    <Image
                                        source={{ uri }}
                                        style={[styles.slotImage, slot.wide && styles.slotImageWide]}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={[styles.slotEmpty, slot.wide && styles.slotEmptyWide]}>
                                        <slot.icon width={slot.key == "body" ? 100 : 70} height={slot.key == "body" ? 100 : 70} />
                                    </View>
                                )}
                                <View style={styles.slotFooter}>
                                    <Text style={styles.slotLabel}>{slot.label}</Text>
                                    <Text style={styles.slotHint}>{slot.hint}</Text>
                                </View>
                                {uri && (
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => removeSlot(slot.key)}
                                        hitSlop={8}
                                    >
                                        <MaterialIcons name="close" size={14} color="white" />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <Modal visible={aiInfoVisible} animationType="none" transparent onRequestClose={closeAiInfo}>
                <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
                    <Pressable style={styles.backdropPressable} onPress={closeAiInfo}>
                        <Pressable onPress={(e) => e.stopPropagation()}>
                            <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 24 }]}>
                                <View style={styles.handle} />
                                <Text style={styles.sheetTitle}>{t('onboarding.photo_upload.ai_info_title')}</Text>
                                <Text style={styles.sheetBody}>{t('onboarding.photo_upload.ai_info_body')}</Text>
                                <TouchableOpacity style={styles.sheetButton} onPress={closeAiInfo} activeOpacity={0.7}>
                                    <Text style={styles.sheetButtonText}>{t('onboarding.photo_upload.ai_info_close')}</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </Pressable>
                    </Pressable>
                </Animated.View>
            </Modal>

            <ImagePickerModal
                visible={pickerTarget !== null}
                onCamera={() => handleCamera(pickerTarget!)}
                onGallery={() => handleGallery(pickerTarget!)}
                onClose={() => setPickerTarget(null)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    container: {
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 24,
    },
    title: {
        fontFamily: Fonts.serifBold,
        fontSize: 28,
        color: Colors.textHeadline,
        marginBottom: 10,
    },
    subtitle: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 14,
        color: Colors.textMuted,
        lineHeight: 21,
        marginBottom: 16,
    },
    consentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 24,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: Colors.textMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: Colors.textHeadline,
        borderColor: Colors.textHeadline,
    },
    consentText: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 13,
        color: Colors.textMuted,
        flexShrink: 1,
    },
    consentLink: {
        textDecorationLine: 'underline',
        color: Colors.text,
    },
    slots: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    slot: {
        width: '48%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.text,
    },
    slotWide: {
        width: '100%',
    },
    slotImage: {
        width: '100%',
        aspectRatio: 3 / 4,
    },
    slotImageWide: {
        aspectRatio: 16 / 9,
    },
    slotEmpty: {
        width: '100%',
        aspectRatio: 3 / 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    slotEmptyWide: {
        aspectRatio: 16 / 9,
    },
    slotFooter: {
        padding: 10,
        gap: 2,
    },
    slotLabel: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 13,
        color: Colors.textHeadline,
    },
    slotHint: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 11,
        color: Colors.textMuted,
        lineHeight: 15,
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // AI info bottom sheet
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdropPressable: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 12,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.borderDivider,
        alignSelf: 'center',
        marginBottom: 8,
    },
    sheetTitle: {
        fontFamily: Fonts.serifBold,
        fontSize: 20,
        color: Colors.textHeadline,
    },
    sheetBody: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 14,
        color: Colors.textMuted,
        lineHeight: 22,
    },
    sheetButton: {
        marginTop: 8,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: Colors.textHeadline,
        alignItems: 'center',
    },
    sheetButtonText: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 15,
        color: Colors.surface,
    },
});
