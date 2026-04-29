import { trackerManager } from "@/lib/tracking/tracker-manager";
import { supabase } from "@/services/supabase/client";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import type { Session } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import { createContext, useContext, useEffect, useState } from "react";

// iosClientId = reverse of iosUrlScheme set in app.json
GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

type AuthContextType = {
    signInWithGoogle: () => Promise<void>;
    signInWithApple: () => Promise<void>;
    sendMagicLink: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    session: Session | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user?.id) {
                trackerManager.identify(session.user.id);
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (event === 'SIGNED_IN' && session?.user?.id) {
                trackerManager.identify(session.user.id);
            }
            if (event === 'SIGNED_OUT') {
                trackerManager.logout();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        await GoogleSignin.hasPlayServices();
        const { data } = await GoogleSignin.signIn();
        const idToken = data?.idToken;
        if (!idToken) throw new Error("No ID token from Google");

        const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: idToken,
        });
        if (error) throw error;
    };

    const signInWithApple = async () => {
        const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
        });
        if (!credential.identityToken) throw new Error("No identity token from Apple");

        const { error } = await supabase.auth.signInWithIdToken({
            provider: "apple",
            token: credential.identityToken,
        });
        if (error) throw error;
    };

    const sendMagicLink = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
    };

    const signOut = async () => {
        await GoogleSignin.signOut().catch(() => { });
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ signInWithGoogle, signInWithApple, sendMagicLink, signOut, session, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
