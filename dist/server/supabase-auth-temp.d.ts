import 'dotenv/config';
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export declare const supabaseAdmin: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export declare class SupabaseAuthService {
    static signUp(email: string, password: string, userData: {
        username: string;
        role: string;
        shop_id?: number;
    }): Promise<{
        user: import("@supabase/supabase-js").AuthUser;
        profile: {
            user_id: string;
            username: string;
            role: string;
            shop_id: number;
        };
    }>;
    static signIn(email: string, password: string): Promise<{
        user: import("@supabase/supabase-js").AuthUser;
        session: import("@supabase/supabase-js").AuthSession;
        profile: {
            user_id: string;
            username: any;
            role: any;
            shop_id: any;
        };
    }>;
    static signInWithUsername(username: string, password: string): Promise<{
        user: import("@supabase/supabase-js").AuthUser;
        session: import("@supabase/supabase-js").AuthSession;
        profile: {
            user_id: string;
            username: any;
            role: any;
            shop_id: any;
        };
    }>;
    static getUserProfile(userId: string): Promise<{
        user_id: string;
        username: any;
        role: any;
        shop_id: any;
    }>;
    static verifyToken(token: string): Promise<{
        user: import("@supabase/supabase-js").AuthUser;
        profile: {
            user_id: string;
            username: any;
            role: any;
            shop_id: any;
        };
    }>;
    static refreshToken(refreshToken: string): Promise<{
        user: import("@supabase/supabase-js").AuthUser | null;
        session: import("@supabase/supabase-js").AuthSession | null;
    } | {
        user: null;
        session: null;
    }>;
    static signOut(token: string): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=supabase-auth-temp.d.ts.map