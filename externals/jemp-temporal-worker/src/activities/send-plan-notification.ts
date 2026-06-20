import { getSupabaseClient } from 'src/utils/supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPlanNotification(input: { userId: string }): Promise<void> {
    const supabase = getSupabaseClient();

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('push_token, first_name')
        .eq('id', input.userId)
        .maybeSingle();

    const token = profile?.push_token;
    if (!token) return; // user has no push token — skip silently

    const body = profile?.first_name
        ? `Hey ${profile.first_name}! Dein persönlicher Trainingsplan ist fertig. Jetzt loslegen! 💪`
        : 'Dein persönlicher Trainingsplan ist fertig. Jetzt loslegen! 💪';

    const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            to: token,
            title: 'Dein Plan ist bereit!',
            body,
            sound: 'default',
            data: { screen: 'plan' },
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`sendPlanNotification: Expo push failed (${res.status}): ${text}`);
    }
}
