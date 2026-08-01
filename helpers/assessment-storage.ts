import { supabase } from '@/services/supabase/client';

const BUCKET = 'assessments';

export function assessmentVideoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
