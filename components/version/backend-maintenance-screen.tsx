import { JempText } from '@/components/jemp-text'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function BackendMaintenanceScreen() {
  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark'
  const colors = Colors[scheme]
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
        <Ionicons name="construct-outline" size={40} color={colors.textMuted} />
      </View>

      <JempText type="h1" style={styles.title}>
        Wartung
      </JempText>

      <JempText type="body-l" color={colors.textMuted} style={styles.body}>
        Wir führen gerade Wartungsarbeiten durch. Die App ist in Kürze wieder verfügbar.
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
})
