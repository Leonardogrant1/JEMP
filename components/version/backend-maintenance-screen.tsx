import Logo from '@/assets/icons/logo.svg'
import { JempText } from '@/components/jemp-text'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function BackendMaintenanceScreen() {
  const { t } = useTranslation()
  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark'
  const colors = Colors[scheme]
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.logoWrapper}>
        <Logo width={64} height={64} />
      </View>

      <JempText type="h1" style={styles.title}>
        {t('version.maintenance_title')}
      </JempText>

      <JempText type="body-l" color={colors.textMuted} style={styles.body}>
        {t('version.maintenance_body')}
      </JempText>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logoWrapper: {
    marginBottom: 16,
  },
  titleRow: {

    alignItems: 'center',

  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    maxWidth: 300,
  },
})
