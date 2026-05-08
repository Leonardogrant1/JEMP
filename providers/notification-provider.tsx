import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';

import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { devLog } from '@/utils/dev-log';
import { registerPushNotifications } from '@/utils/register-push-notifications';

interface NotificationContextValue {
    expoPushToken: string | null;
    registerPushNotificationsAndSaveToken: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { profile } = useCurrentUser();
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

    useEffect(() => {
        if (profile?.has_onboarded) {
            registerPushNotificationsAndSaveToken();
        }
    }, [profile?.id]);

    useEffect(() => {
        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
            devLog('Notification received:', notification);
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            devLog('Notification response:', response);
            const data = response.notification.request.content.data as Record<string, string> | undefined;
            if (!data) return;
            if (data.sessionId) {
                router.push(`/session/${data.sessionId}`);
            } else if (data.screen === 'assessments') {
                router.push('/(tabs)/assessments');
            }
        });

        return () => {
            notificationListener.remove();
            responseListener.remove();
        };
    }, []);

    const registerPushNotificationsAndSaveToken = async () => {
        const { status, pushTokenString } = await registerPushNotifications();
        trackerManager.track('notifications_permission', {
            status: status === 'granted' ? 'authorized' : 'declined',
        });
        setExpoPushToken(pushTokenString ?? null);
        if (pushTokenString && profile?.id && pushTokenString !== profile.push_token) {
            devLog('Push token changed, saving to DB:', pushTokenString);
            await supabase
                .from('user_profiles')
                .update({ push_token: pushTokenString })
                .eq('id', profile.id);
        }
    };

    return (
        <NotificationContext.Provider value={{ expoPushToken, registerPushNotificationsAndSaveToken }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
}
