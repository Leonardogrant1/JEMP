import { Tracker } from './tracker';
import { PostHogTracker } from './trackers/posthog-tracker';

export class TrackerManager {
    private static instance: TrackerManager;
    private trackers: Tracker[] = [];
    private posthog?: PostHogTracker;
    private initialized = false;

    private constructor() {}

    static getInstance(): TrackerManager {
        if (!TrackerManager.instance) {
            TrackerManager.instance = new TrackerManager();
        }
        return TrackerManager.instance;
    }

    register(tracker: Tracker): void {
        if (tracker instanceof PostHogTracker) {
            this.posthog = tracker;
        }
        this.trackers.push(tracker);
    }

    init(): void {
        if (this.initialized) return;
        this.initialized = true;
        for (const tracker of this.trackers) {
            this.safeCall(tracker, 'init', () => tracker.init());
        }
    }

    identify(userId: string, properties?: Record<string, unknown>): void {
        for (const tracker of this.trackers) {
            this.safeCall(tracker, 'identify', () => tracker.identify(userId, properties));
        }
    }

    track(event: string, properties?: Record<string, unknown>): void {
        const enriched = { ...properties, is_debug: __DEV__ };
        for (const tracker of this.trackers) {
            this.safeCall(tracker, 'track', () => tracker.track(event, enriched));
        }
    }

    logout(): void {
        for (const tracker of this.trackers) {
            this.safeCall(tracker, 'logout', () => tracker.logout());
        }
    }

    private safeCall(tracker: Tracker, method: string, fn: () => void): void {
        try {
            fn();
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            const trackerName = tracker.constructor.name;
            console.error(`[TrackerManager] ${trackerName}.${method} failed:`, err);
            if (this.posthog && tracker !== this.posthog) {
                try {
                    this.posthog.track('tracker_error', { tracker: trackerName, method, error });
                } catch {
                    console.error('[TrackerManager] PostHog error reporting failed');
                }
            }
        }
    }
}

export const trackerManager = TrackerManager.getInstance();
