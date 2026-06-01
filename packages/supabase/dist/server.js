"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const ssr_1 = require("@supabase/ssr");
const headers_1 = require("next/headers");
async function createClient() {
    const cookieStore = await (0, headers_1.cookies)();
    return (0, ssr_1.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            get(name) {
                return cookieStore.get(name)?.value;
            },
            set(name, value, options) {
                try {
                    cookieStore.set({ name, value, ...options });
                }
                catch (error) {
                    // The `set` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing sessions.
                }
            },
            remove(name, options) {
                try {
                    cookieStore.set({ name, value: '', ...options });
                }
                catch (error) {
                    // The `delete` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing sessions.
                }
            },
        },
    });
}
