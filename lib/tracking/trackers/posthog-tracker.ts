import { getPosthog, initPosthog } from '@/services/posthog/init';
import { Tracker } from '../tracker';

export class PostHogTracker extends Tracker {
    init(): void {
        initPosthog();
    }

    identify(userId: string, properties?: Record<string, unknown>): void {
        getPosthog()?.identify(userId, properties as any);
    }

    track(event: string, properties?: Record<string, unknown>): void {
        getPosthog()?.capture(event, properties as any);
    }

    logout(): void {
        getPosthog()?.reset();
    }
}
