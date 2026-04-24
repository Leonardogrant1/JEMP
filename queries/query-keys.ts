export const queryKeys = {
    plan: (userId: string | undefined) => ['plan', userId] as const,
    sessionDetail: (sessionId: string | undefined) => ['session-detail', sessionId] as const,
    allSessions: ['session-detail'] as const,
    exerciseDetail: (exerciseId: string | undefined) => ['exercise-detail', exerciseId] as const,
    sessionSummary: (sessionId: string | undefined) => ['session-summary', sessionId] as const,
    userAssessments: (userId: string | undefined) => ['assessments', userId] as const,
    userCategoryLevels: (userId: string | undefined) => ['category-levels', userId] as const,
    userCategoryHistory: (userId: string | undefined, since: string | undefined) => ['category-history', userId, since] as const,
    categoryAssessments: (userId: string | undefined, slug: string | undefined, since: string | undefined) =>
        ['category-assessments', userId, slug, since] as const,
};
