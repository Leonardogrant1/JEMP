import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from './query-keys';

export function useInvalidate() {
    const qc = useQueryClient();

    const invalidatePlan = useCallback(
        () => qc.invalidateQueries({ queryKey: ['plan'] }),
        [qc],
    );

    const invalidateSessionDetail = useCallback(
        (sessionId?: string) =>
            sessionId
                ? qc.invalidateQueries({ queryKey: queryKeys.sessionDetail(sessionId) })
                : qc.invalidateQueries({ queryKey: queryKeys.allSessions }),
        [qc],
    );

    const invalidateAll = useCallback(
        () => qc.invalidateQueries(),
        [qc],
    );

    return { invalidatePlan, invalidateSessionDetail, invalidateAll };
}
