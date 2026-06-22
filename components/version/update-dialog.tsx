// components/version/update-dialog.tsx
import { JempText } from '@/components/jemp-text'
import { Colors, GRADIENT } from '@/constants/theme'
import { STORE_URL } from '@/constants/store-urls'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { LinearGradient } from 'expo-linear-gradient'
import { Linking, Modal, Pressable, StyleSheet } from 'react-native'

type Props = {
  storeVersion: string
  releaseNotes: string | null
  onDismiss: () => void
}

export function UpdateDialog({ storeVersion, releaseNotes, onDismiss }: Props) {
  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark'
  const colors = Colors[scheme]

  const handleUpdate = () => {
    Linking.openURL(STORE_URL)
    onDismiss()
  }

  return (
    <Modal transparent animationType="fade" visible>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderCard }]}>
          <JempText type="h2" style={styles.title}>
            Update verfügbar
          </JempText>

          <JempText type="body-sm" color={colors.textMuted} style={styles.version}>
            Version {storeVersion}
          </JempText>

          {releaseNotes ? (
            <JempText type="body-sm" color={colors.textMuted} style={styles.notes}>
              {releaseNotes}
            </JempText>
          ) : null}

          <Pressable onPress={handleUpdate} style={styles.buttonWrapper}>
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <JempText type="button" color="#fff">
                Jetzt updaten
              </JempText>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={onDismiss} style={styles.laterButton}>
            <JempText type="body-sm" color={colors.textMuted}>
              Später
            </JempText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
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
  },
  title: {
    marginBottom: 2,
  },
  version: {
    marginBottom: 4,
  },
  notes: {
    marginBottom: 8,
  },
  buttonWrapper: {
    marginTop: 8,
  },
  button: {
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
})
