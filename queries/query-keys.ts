export const queryKeys = {
    plan: (userId: string | undefined) => ['plan', userId] as const,
    sessionDetail: (sessionId: string | undefined) => ['session-detail', sessionId] as const,
    allSessions: ['session-detail'] as const,
    exerciseDetail: (exerciseId: string | undefined) => ['exercise-detail', exerciseId] as const,
    sessionSummary: (sessionId: string | undefined) => ['session-summary', sessionId] as const,
};
