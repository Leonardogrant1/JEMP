import * as Notifications from 'expo-notifications';
import { createMMKV } from 'react-native-mmkv';

import { devLog } from '@/utils/dev-log';

type NotificationSettings = {
    notificationsEnabled: boolean;
    notificationsPerDay: number;
    notificationStartHour: number;
    notificationEndHour: number;
    randomizeNotificationTimes: boolean;
    selectedCategories: string[];
    visionAffirmations?: string[];
};

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const storage = createMMKV({ id: 'notification-storage' });
const LAST_SCHEDULED_KEY = 'lastScheduled';
const TRIAL_END_KEY = 'trialEndISO';

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

async function restoreTrialReminder(): Promise<void> {
    const trialEndISO = storage.getString(TRIAL_END_KEY);
    if (!trialEndISO) return;

    const trialEndDate = new Date(trialEndISO);
    const reminderDate = new Date(trialEndDate.getTime() - 24 * 60 * 60 * 1000);
    if (reminderDate <= new Date()) return;

    const langRaw = storage.getString('trialReminderLanguage');
    const language = langRaw === 'de' ? 'de' : 'en';
    const content = language === 'de'
        ? { title: '⏰ veezy', body: 'Dein kostenloser Testzeitraum endet morgen.' }
        : { title: '⏰ veezy', body: 'Your free trial ends tomorrow.' };

    await Notifications.scheduleNotificationAsync({
        identifier: 'trial-end-reminder',
        content,
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
        },
    });
}

export async function scheduleNotifications(settings: NotificationSettings): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!settings.notificationsEnabled) return;
    if (!settings.selectedCategories || settings.selectedCategories.length === 0) return;
    if (!settings.visionAffirmations || settings.visionAffirmations.length === 0) return;

    const {
        notificationsPerDay,
        notificationStartHour,
        notificationEndHour,
        randomizeNotificationTimes,
    } = settings;

    const MAX_NOTIFICATIONS = 60;
    const days = Math.floor(MAX_NOTIFICATIONS / notificationsPerDay);
    const totalNeeded = days * notificationsPerDay;

    let pool: string[] = [];
    while (pool.length < totalNeeded) {
        pool = [...pool, ...shuffle(settings.visionAffirmations)];
    }

    let affirmationIndex = 0;
    const scheduled: Promise<string>[] = [];

    for (let day = 0; day < days; day++) {
        const date = new Date();
        date.setDate(date.getDate() + day + 1);

        for (let i = 0; i < notificationsPerDay; i++) {
            const body = pool[affirmationIndex++];

            const baseHour = notificationStartHour + i * (notificationEndHour - notificationStartHour) / notificationsPerDay;
            const hour = Math.floor(baseHour);
            const baseMinute = Math.round((baseHour % 1) * 60);
            const offset = randomizeNotificationTimes ? Math.floor(Math.random() * 21) - 10 : 0;
            const minute = clamp(baseMinute + offset, 0, 59);

            scheduled.push(
                Notifications.scheduleNotificationAsync({
                    content: {
                        title: '✨ veezy',
                        body,
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                        year: date.getFullYear(),
                        month: date.getMonth() + 1,
                        day: date.getDate(),
                        hour,
                        minute,
                        second: 0,
                    },
                })
            );
        }
    }

    await Promise.all(scheduled);
    await restoreTrialReminder();
    storage.set(LAST_SCHEDULED_KEY, new Date().toISOString());
    devLog(`Scheduled ${totalNeeded} notifications over ${days} days`);
}

export async function checkAndReschedule(settings: NotificationSettings): Promise<void> {
    const lastScheduled = storage.getString(LAST_SCHEDULED_KEY);

    if (!lastScheduled) {
        await scheduleNotifications(settings);
        return;
    }

    const daysSince = (Date.now() - new Date(lastScheduled).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= 7) {
        await scheduleNotifications(settings);
    }
}

const PAYWALL_ABANDON_ID = 'paywall-abandon-reminder';

const PAYWALL_ABANDON_CONTENT: Record<'de' | 'en', { title: string; body: string }> = {
    de: { title: '🔓 veezy', body: 'Veezy ist freigeschaltet! Schaue dich um.' },
    en: { title: '🔓 veezy', body: 'Veezy is unlocked! Take a look around.' },
};

export async function schedulePaywallAbandonNotification(language: 'de' | 'en' = 'en'): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(PAYWALL_ABANDON_ID).catch(() => { });
    const triggerDate = new Date(Date.now() + 30 * 1000); // 30s later
    await Notifications.scheduleNotificationAsync({
        identifier: PAYWALL_ABANDON_ID,
        content: PAYWALL_ABANDON_CONTENT[language],
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
        },
    });
    devLog('Scheduled paywall abandon notification for', triggerDate.toISOString());
}

export async function cancelPaywallAbandonNotification(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(PAYWALL_ABANDON_ID).catch(() => { });
}

export async function scheduleTrialEndReminder(
    trialEndDateISO: string,
    language: 'de' | 'en' = 'en',
): Promise<void> {
    const trialEndDate = new Date(trialEndDateISO);
    const reminderDate = new Date(trialEndDate.getTime() - 24 * 60 * 60 * 1000);

    if (reminderDate <= new Date()) return;

    storage.set(TRIAL_END_KEY, trialEndDateISO);
    storage.set('trialReminderLanguage', language);

    const content = language === 'de'
        ? { title: '⏰ veezy', body: 'Dein kostenloser Testzeitraum endet morgen.' }
        : { title: '⏰ veezy', body: 'Your free trial ends tomorrow.' };

    await Notifications.scheduleNotificationAsync({
        identifier: 'trial-end-reminder',
        content,
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
        },
    });
}
