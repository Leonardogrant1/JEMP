import { initAppsFlyer } from '@/services/appsflyer/init';
import appsFlyer from 'react-native-appsflyer';
import { Tracker } from '../tracker';

export class AppsFlyerTracker extends Tracker {
    init(): void {
        initAppsFlyer();
    }

    identify(userId: string): void {
        appsFlyer.setCustomerUserId(userId);
    }

    track(event: string, properties?: Record<string, unknown>): void {
        appsFlyer.logEvent(event, properties ?? {});
    }

    logout(): void {
        appsFlyer.setCustomerUserId('');
    }
}
