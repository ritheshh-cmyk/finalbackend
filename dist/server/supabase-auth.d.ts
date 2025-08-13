export declare const supabaseAdmin: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export interface User {
    id: string;
    email: string;
    username: string;
    role: 'admin' | 'owner' | 'worker';
    shop_id?: number;
    created_at: string;
    updated_at: string;
}
export interface UserProfile {
    id: string;
    user_id: string;
    username: string;
    role: 'admin' | 'owner' | 'worker';
    shop_id?: number;
    created_at: string;
    updated_at: string;
}
export declare class SupabaseAuthService {
    static signUp(email: string, password: string, userData: {
        username: string;
        role: string;
        shop_id?: number;
    }): Promise<{
        user: import("@supabase/supabase-js").AuthUser;
        profile: any;
    }>;
    static signIn(email: string, password: string): Promise<{
        user: import("@supabase/supabase-js").AuthUser;
        session: import("@supabase/supabase-js").AuthSession;
        profile: UserProfile;
    }>;
    static signInWithUsername(username: string, password: string): Promise<{
        user: import("@supabase/supabase-js").AuthUser;
        session: import("@supabase/supabase-js").AuthSession;
        profile: UserProfile;
    }>;
    static getUserProfile(userId: string): Promise<UserProfile | null>;
    static verifyToken(token: string): Promise<{
        user: import("@supabase/supabase-js").AuthUser;
        profile: UserProfile;
    }>;
    static signOut(token?: string): Promise<boolean>;
    static migrateExistingUsers(): Promise<boolean>;
}
export default SupabaseAuthService;
//# sourceMappingURL=supabase-auth.d.ts.map