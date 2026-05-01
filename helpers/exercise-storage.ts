import { supabase } from '@/services/supabase/client';

const BUCKET = 'exercises';

export function exerciseThumbnailUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function exerciseVideoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
