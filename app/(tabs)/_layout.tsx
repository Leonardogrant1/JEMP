import { TabBar } from '@/components/tab-bar';
import { useAuth } from '@/providers/auth-provider';
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const { session, signOut } = useAuth();
  const { refreshProfile } = useCurrentUser();
  const resetOnboardingStore = useOnboardingStore(s => s.reset);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={props => <TabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="plan" />
        <Tabs.Screen name="progress" />
        <Tabs.Screen name="profile" />
      </Tabs>

      {__DEV__ && (
        <View style={styles.debugContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              await signOut();
            }}
          >
            <Text style={styles.debugButtonText}>🚪 Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              if (!session) return;
              await supabase
                .from('user_profiles')
                .update({
                  has_onboarded: false,
                  first_name: null,
                  last_name: null,
                  birth_date: null,
                  gender: null,
                  sport_id: null,
                  height_in_cm: null,
                  weight_in_kg: null,
                  preferred_workout_days: [],
                  preferred_session_duration: null,
                  timezone: null,
                })
                .eq('id', session.user.id);
              resetOnboardingStore();
              await refreshProfile();
            }}
          >
            <Text style={styles.debugButtonText}>🔄 Reset Onboarding</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              if (!session) return;
              await supabase
                .from('user_profiles')
                .update({ has_seen_tutorial: false })
                .eq('id', session.user.id);
              await refreshProfile();
            }}
          >
            <Text style={styles.debugButtonText}>🎓 Reset Tutorial</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  debugContainer: {
    position: 'absolute',
    top: 80,
    right: 16,
    gap: 8,
    alignItems: 'flex-end',
    zIndex: 9999,
  },
  debugButton: {
    backgroundColor: 'rgba(255,59,48,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
