import { JempText } from '@/components/jemp-text'
import { Colors, GRADIENT } from '@/constants/theme'
import { STORE_URL } from '@/constants/store-urls'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Linking, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = {
  releaseNotes: string | null
}

export function ForceUpdateScreen({ releaseNotes }: Props) {
  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark'
  const colors = Colors[scheme]
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-up-circle-outline" size={40} color={GRADIENT[0]} />
        </View>

        <JempText type="h1" style={styles.title}>
          Update erforderlich
        </JempText>

        <JempText type="body-l" color={colors.textMuted} style={styles.body}>
          Diese Version der App wird nicht mehr unterstützt. Bitte update die App um weiterzumachen.
        </JempText>

        {releaseNotes ? (
          <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.borderCard }]}>
            <JempText type="body-sm" color={colors.textMuted}>
              {releaseNotes}
            </JempText>
          </View>
        ) : null}
      </View>

      <Pressable onPress={() => Linking.openURL(STORE_URL)} style={styles.buttonWrapper}>
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    maxWidth: 300,
  },
  notesCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    width: '100%',
    marginTop: 8,
  },
  buttonWrapper: {
    marginTop: 24,
  },
  button: {
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
