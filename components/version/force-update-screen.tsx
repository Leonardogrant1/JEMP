import Logo from '@/assets/icons/logo.svg'
import { JempText } from '@/components/jemp-text'
import { Colors, GRADIENT } from '@/constants/theme'
import { STORE_URL } from '@/constants/store-urls'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import { Linking, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = {
  releaseNotes: string | null
}

export function ForceUpdateScreen({ releaseNotes }: Props) {
  const { t } = useTranslation()
  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark'
  const colors = Colors[scheme]
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <View style={styles.logoWrapper}>
          <Logo width={64} height={64} />
        </View>

        <JempText type="h1" style={styles.title}>
          {t('version.force_update_title')}
        </JempText>

        <JempText type="body-l" color={colors.textMuted} style={styles.body}>
          {t('version.force_update_body')}
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
            {t('version.update_now')}
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
  logoWrapper: {
    marginBottom: 16,
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
