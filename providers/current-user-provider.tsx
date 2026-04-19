import { supabase } from "@/services/supabase/client";
import { UserProfile } from "@/types/database";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-provider";

type CurrentUserContextType = {
    profile: UserProfile | null;
    isLoading: boolean;
    isRefreshing: boolean;
    refreshProfile: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextType | null>(null);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
    const { session, loading: authLoading } = useAuth();
    const user = session?.user;
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true); // only true until first fetch completes
    const [isRefreshing, setIsRefreshing] = useState(false);
    const hasLoadedOnce = useRef(false);

    const fetchProfile = useCallback(async () => {
        if (authLoading) return; // wait for auth to settle first

        if (!user) {
            setProfile(null);
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }

        if (hasLoadedOnce.current) {
            setIsRefreshing(true);
        }

        const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        setProfile(data ?? null);
        setIsLoading(false);
        setIsRefreshing(false);
        hasLoadedOnce.current = true;
    }, [user, authLoading]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return (
        <CurrentUserContext.Provider value={{ profile, isLoading, isRefreshing, refreshProfile: fetchProfile }}>
            {children}
        </CurrentUserContext.Provider>
    );
}

export const useCurrentUser = () => {
    const ctx = useContext(CurrentUserContext);
    if (!ctx) throw new Error("useCurrentUser must be used within CurrentUserProvider");
    return ctx;
};
