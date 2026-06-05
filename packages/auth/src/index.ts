export { createBrowserSupabase } from "./client.js";
export { createServerSupabase, type CookieAdapter } from "./server.js";
export { createServiceSupabase } from "./service.js";
export {
  getUser,
  requireUser,
  requireAdmin,
  getRole,
  AuthError,
  type Role,
} from "./guards.js";
export {
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
} from "./env.js";
