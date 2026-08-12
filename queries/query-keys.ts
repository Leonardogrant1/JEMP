export const queryKeys = {
    plan: (userId: string | undefined) => ['plan', userId] as const,
    hasHadPlan: (userId: string | undefined) => ['has-had-plan', userId] as const,
    sessionDetail: (sessionId: string | undefined) => ['session-detail', sessionId] as const,
    allSessions: ['session-detail'] as const,
    exerciseDetail: (exerciseId: string | undefined) => ['exercise-detail', exerciseId] as const,
    sessionSummary: (sessionId: string | undefined) => ['session-summary', sessionId] as const,
    userAssessments: (userId: string | undefined) => ['assessments', userId] as const,
    userCategoryLevels: (userId: string | undefined) => ['category-levels', userId] as const,
    userCategoryHistory: (userId: string | undefined, since: string | undefined) => ['category-history', userId, since] as const,
    userAchievements: (userId: string | undefined) => ['user-achievements', userId] as const,
    assessmentBestValues: (userId: string | undefined) => ['assessment-best-values', userId] as const,
    categoryAssessments: (userId: string | undefined, slug: string | undefined, since: string | undefined) =>
        ['category-assessments', userId, slug, since] as const,
    previousExerciseSets: (exerciseId: string | undefined, sessionId: string | undefined) =>
        ['previous-exercise-sets', exerciseId, sessionId] as const,
    planExerciseProgress: (planId: string | undefined) => ['plan-exercise-progress', planId] as const,
    sportAnimationMeta: (slug: string | undefined) => ['sport-animation-meta', slug] as const,
    sportGroupBanner: (groupName: string | undefined) => ['sport-group-banner', groupName] as const,
    sportGroupAnimation: (groupName: string | undefined) => ['sport-group-animation', groupName] as const,
    sessionThumbnails: ['session-thumbnails'] as const,
};
