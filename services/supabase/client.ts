import { Database } from "@/database.types";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from 'expo-secure-store';


const ExpoSecureStoreAdapter = {
    getItem: async (key: string) => {
        const value = await SecureStore.getItemAsync(key);
        return value;
    },
    setItem: async (key: string, value: string) => {
        await SecureStore.setItemAsync(key, value);
    },
    removeItem: async (key: string) => {
        await SecureStore.deleteItemAsync(key);
    },
}


export const supabase = createClient<Database>(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: {
            storage: ExpoSecureStoreAdapter,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    }
)