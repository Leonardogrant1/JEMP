


export abstract class Tracker {
    abstract identify(userId: string, properties?: Record<string, unknown>): void;
    abstract track(event: string, properties?: Record<string, unknown>): void;
    abstract init(): void;
    abstract logout(): void;
}