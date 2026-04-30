import { TabBar } from '@/components/tab-bar';
import { useAuth } from '@/providers/auth-provider';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useRevenueCat } from '@/services/purchases/revenuecat/providers/RevenueCatProvider';
import { PREMIUM_IDENTIFIER } from '@/services/purchases/revenuecat/constants';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useTutorialStore } from '@/stores/tutorial-store';
import { useQueryClient } from '@tanstack/react-query';
import { router, Tabs } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const { session, signOut } = useAuth();
  const { refreshProfile } = useCurrentUser();
  const { hasEntitlement } = useRevenueCat();
  const resetOnboardingStore = useOnboardingStore(s => s.reset);
  const setHasSeenTutorial = useTutorialStore(s => s.setHasSeenTutorial);
  const queryClient = useQueryClient();
  const [devOpen, setDevOpen] = useState(false);
  const isSubscribed = hasEntitlement(PREMIUM_IDENTIFIER);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={props => <TabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="plan" />
        <Tabs.Screen name="assessments" />
        <Tabs.Screen name="progress" />
        <Tabs.Screen name="profile" />
      </Tabs>

      {__DEV__ && (
        <View style={styles.debugContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.debugToggle, devOpen && styles.debugToggleActive]}
            onPress={() => setDevOpen(o => !o)}
          >
            <Text style={styles.debugButtonText}>🛠</Text>
          </TouchableOpacity>

          {devOpen && (
            <>
              <View style={[styles.debugButton, { backgroundColor: isSubscribed ? 'rgba(34,197,94,0.85)' : 'rgba(100,100,100,0.85)' }]}>
                <Text style={styles.debugButtonText}>
                  {isSubscribed ? '✅ full_access active' : '🔒 no subscription'}
                </Text>
              </View>

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
                onPress={() => {
                  setHasSeenTutorial(false);
                  router.replace('/tutorial');
                }}
              >
                <Text style={styles.debugButtonText}>🎓 Reset Tutorial</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.debugButton}
                onPress={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('create-user-assessments');
                    if (error) throw error;
                    await queryClient.invalidateQueries({ queryKey: ['assessments'] });
                    Alert.alert('Assessments', `Created for ${data?.users_notified ?? 0} user(s)`);
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}
              >
                <Text style={styles.debugButtonText}>📋 Create Assessments</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.debugButton}
                onPress={async () => {
                  const { error } = await supabase.rpc('fn_take_category_level_snapshot');
                  if (error) Alert.alert('Snapshot failed', error.message);
                  else Alert.alert('Done', 'Category level snapshot written');
                }}
              >
                <Text style={styles.debugButtonText}>📸 Snapshot Levels</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.debugButton}
                onPress={async () => {
                  if (!session) return;
                  const { error } = await supabase.rpc('fn_dev_seed_category_history', {
                    p_user_id: session.user.id,
                    p_days: 10,
                  });
                  if (error) Alert.alert('Seed failed', error.message);
                  else {
                    await queryClient.invalidateQueries({ queryKey: ['category-history'] });
                    Alert.alert('Done', '10 days of history seeded');
                  }
                }}
              >
                <Text style={styles.debugButtonText}>🌱 Seed History</Text>
              </TouchableOpacity>
            </>
          )}
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
  debugToggle: {
    backgroundColor: 'rgba(255,59,48,0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugToggleActive: {
    backgroundColor: 'rgba(255,59,48,0.85)',
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
