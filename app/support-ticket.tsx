import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useCurrentUser } from '@/providers/current-user-provider';
import { Ionicons } from '@expo/vector-icons';
import { File as ExpoFile } from 'expo-file-system';
import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Reanimated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface AttachedFile {
    uri: string;
    name: string;
    type: string;
    size: number;
}

function getMimeType(uri: string, assetMimeType?: string): string {
    if (assetMimeType) return assetMimeType;
    const extension = uri.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        case 'heic': return 'image/heic';
        case 'mp4': return 'video/mp4';
        case 'mov': return 'video/quicktime';
        case 'm4v': return 'video/x-m4v';
        case 'avi': return 'video/x-msvideo';
        case 'mkv': return 'video/x-matroska';
        case 'webm': return 'video/webm';
        default:
            return 'application/octet-stream';
    }
}

export default function SupportTicketScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [attachments, setAttachments] = useState<AttachedFile[]>([]);
    const [status, setStatus] = useState<Status>('idle');

    const slideValue = useSharedValue(600);
    const overlayValue = useSharedValue(0);

    useEffect(() => {
        overlayValue.value = withTiming(1, { duration: 250 });
        slideValue.value = withTiming(0, { duration: 300 });
    }, []);

    function goBack() {
        router.back();
    }

    function handleClose() {
        overlayValue.value = withTiming(0, { duration: 200 });
        slideValue.value = withTiming(600, { duration: 200 }, (finished) => {
            if (finished) {
                runOnJS(goBack)();
            }
        });
    }

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideValue.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: overlayValue.value,
    }));

    async function handlePickMedia() {
        Keyboard.dismiss();
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsMultipleSelection: true,
                quality: 0.8,
            });

            if (result.canceled || !result.assets) return;

            const newAttachments = [...attachments];
            for (const asset of result.assets) {
                let size = asset.fileSize;
                if (!size) {
                    try {
                        const file = new ExpoFile(asset.uri);
                        size = file.size || 0;
                    } catch {
                        size = 0;
                    }
                }

                const isVideo = (asset.mimeType ?? getMimeType(asset.uri)).startsWith('video/');
                const maxSize = isVideo ? 200 * 1024 * 1024 : 20 * 1024 * 1024;
                const limitLabel = isVideo ? '200 MB' : '20 MB';
                if (size > maxSize) {
                    Alert.alert(t('ui.support_file_too_large_title'), t('ui.support_file_too_large_desc_v2', { limit: limitLabel }));
                    continue;
                }

                const name = asset.fileName || asset.uri.split('/').pop() || `media_${Date.now()}`;
                const type = getMimeType(asset.uri, asset.mimeType);

                newAttachments.push({ uri: asset.uri, name, type, size });
            }
            setAttachments(newAttachments);
        } catch (error) {
            console.error('Error picking media:', error);
        }
    }

    function handleRemoveAttachment(index: number) {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }

    async function handleSubmit() {
        if (!title.trim() || !description.trim()) return;
        setStatus('loading');
        try {
            const createRes = await fetch('https://www.northbyte.studio/api/tickets/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    userId: profile?.id,
                    email: profile?.email,
                    appSlug: 'jemp',
                }),
            });

            if (!createRes.ok) {
                setStatus('error');
                return;
            }

            const { ticketNumber } = await createRes.json();

            if (attachments.length > 0) {
                const uploadedUrls: string[] = [];

                for (const attachment of attachments) {
                    const uploadUrlRes = await fetch('https://www.northbyte.studio/api/r2/upload-url', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_NORTHBYTE_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            bucket: 'support-media',
                            fileName: attachment.name,
                            fileType: attachment.type,
                            key: `${ticketNumber}/${attachment.name}`,
                        }),
                    });

                    if (!uploadUrlRes.ok) throw new Error('Failed to get upload URL');

                    const { uploadUrl } = await uploadUrlRes.json();

                    const uploadResult = await uploadAsync(uploadUrl, attachment.uri, {
                        httpMethod: 'PUT',
                        uploadType: FileSystemUploadType.BINARY_CONTENT,
                        headers: { 'Content-Type': attachment.type },
                    });

                    if (uploadResult.status < 200 || uploadResult.status >= 300) {
                        throw new Error('Failed to upload file to storage');
                    }

                    uploadedUrls.push(`${ticketNumber}/${attachment.name}`);
                }

                await fetch('https://www.northbyte.studio/api/tickets/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketNumber, assets: uploadedUrls }),
                });
            }

            trackerManager.track('support_ticket_created');
            setStatus('success');
        } catch (error) {
            console.error('Error creating support ticket:', error);
            setStatus('error');
        }
    }

    const canSubmit = title.trim().length > 0 && description.trim().length > 0 && status === 'idle';

    return (
        <Reanimated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={styles.backdropPressable} onPress={handleClose}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <Reanimated.View style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}>
                        <KeyboardAwareScrollView
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            bottomOffset={24}
                        >
                            <View style={[styles.content, { paddingBottom: insets.bottom + 8 }]}>
                                <View style={[styles.handle, { backgroundColor: theme.borderDivider }]} />

                                <View style={styles.header}>
                                    <JempText type="h2" color={theme.text}>
                                        {t('ui.support_ticket')}
                                    </JempText>
                                    <TouchableOpacity onPress={handleClose} hitSlop={8}>
                                        <Ionicons name="close" size={22} color={theme.textMuted} />
                                    </TouchableOpacity>
                                </View>

                                {status === 'success' ? (
                                    <View style={styles.successState}>
                                        <Ionicons name="checkmark-circle" size={52} color={Cyan[500]} />
                                        <JempText type="h2" color={theme.text} style={styles.successTitle}>
                                            {t('ui.support_success_title')}
                                        </JempText>
                                        <JempText type="caption" color={theme.textMuted} style={styles.successSubtitle}>
                                            {t('ui.support_success_subtitle')}
                                        </JempText>
                                        <TouchableOpacity
                                            style={styles.submitButton}
                                            onPress={handleClose}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={[Cyan[500], Electric[500]]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={StyleSheet.absoluteFill}
                                            />
                                            <JempText type="body-l" color="#fff">{t('ui.support_close')}</JempText>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.field}>
                                            <JempText type="caption" color={theme.textMuted}>
                                                {t('ui.support_field_title')}
                                            </JempText>
                                            <JempInput
                                                variant="outlined"
                                                value={title}
                                                onChangeText={setTitle}
                                                placeholder={t('ui.support_field_title_placeholder')}
                                                editable={status === 'idle'}
                                            />
                                        </View>

                                        <View style={styles.field}>
                                            <JempText type="caption" color={theme.textMuted}>
                                                {t('ui.support_field_description')}
                                            </JempText>
                                            <JempInput
                                                variant="outlined"
                                                value={description}
                                                onChangeText={setDescription}
                                                placeholder={t('ui.support_field_description_placeholder')}
                                                multiline
                                                numberOfLines={4}
                                                textAlignVertical="top"
                                                editable={status === 'idle'}
                                                style={styles.inputMultiline}
                                            />
                                        </View>

                                        <View style={styles.field}>
                                            <JempText type="caption" color={theme.textMuted}>
                                                {t('ui.support_field_attachments')}
                                            </JempText>

                                            {attachments.length > 0 && (
                                                <View style={styles.attachmentsList}>
                                                    {attachments.map((file, idx) => {
                                                        const isImg = file.type.startsWith('image/');
                                                        return (
                                                            <View key={idx} style={[styles.attachmentItem, { backgroundColor: theme.borderDivider, borderColor: theme.borderDivider }]}>
                                                                {isImg ? (
                                                                    <Image source={{ uri: file.uri }} style={styles.attachmentPreview} />
                                                                ) : (
                                                                    <View style={[styles.attachmentPreview, styles.videoPlaceholder]}>
                                                                        <Ionicons name="videocam" size={20} color={theme.text} />
                                                                    </View>
                                                                )}
                                                                <View style={styles.attachmentMeta}>
                                                                    <JempText type="body-sm" color={theme.text} numberOfLines={1}>
                                                                        {file.name}
                                                                    </JempText>
                                                                    <JempText type="caption" color={theme.textMuted}>
                                                                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                                    </JempText>
                                                                </View>
                                                                <TouchableOpacity
                                                                    style={styles.removeBtn}
                                                                    onPress={() => handleRemoveAttachment(idx)}
                                                                    disabled={status === 'loading'}
                                                                >
                                                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                                                </TouchableOpacity>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            )}

                                            <TouchableOpacity
                                                style={[styles.attachButton, { borderColor: theme.borderDivider }]}
                                                onPress={handlePickMedia}
                                                disabled={status !== 'idle'}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="file-tray" size={18} color={theme.text} />
                                                <JempText type="body-sm" color={theme.text}>
                                                    {t('ui.support_add_media')}
                                                </JempText>
                                            </TouchableOpacity>
                                        </View>

                                        {status === 'error' && (
                                            <JempText type="caption" color="#ef4444" style={styles.errorText}>
                                                {t('ui.support_error')}
                                            </JempText>
                                        )}

                                        <TouchableOpacity
                                            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                                            onPress={handleSubmit}
                                            disabled={!canSubmit}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={[Cyan[500], Electric[500]]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={StyleSheet.absoluteFill}
                                            />
                                            {status === 'loading' ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <JempText type="body-l" color="#fff">{t('ui.support_submit')}</JempText>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </KeyboardAwareScrollView>
                    </Reanimated.View>
                </Pressable>
            </Pressable>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdropPressable: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    content: {
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 16,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    field: {
        gap: 6,
    },
    inputMultiline: {
        height: 110,
        paddingTop: 12,
    },
    errorText: {
        marginTop: -8,
    },
    submitButton: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
        width: '100%',
        overflow: 'hidden',
    },
    submitButtonDisabled: {
        opacity: 0.35,
    },
    successState: {
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    successTitle: {
        marginTop: 4,
    },
    successSubtitle: {
        textAlign: 'center',
        lineHeight: 20,
    },
    attachmentsList: {
        gap: 8,
        marginTop: 4,
    },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        padding: 8,
        gap: 12,
    },
    attachmentPreview: {
        width: 44,
        height: 44,
        borderRadius: 8,
    },
    videoPlaceholder: {
        backgroundColor: 'rgba(0,0,0,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachmentMeta: {
        flex: 1,
        justifyContent: 'center',
    },
    removeBtn: {
        padding: 8,
    },
    attachButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 8,
        marginTop: 4,
    },
});
