import { Context, Next, MiddlewareHandler } from "hono";
import { supabase } from "../../db/supabase.ts";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  phone?: string;
  role: 'client' | 'expert' | 'admin';
}

export type Env = {
  Variables: {
    user: AuthenticatedUser;
  };
};

export const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.split(" ")[1];
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return c.json({ error: error?.message || "Invalid or expired token" }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profileError || !profile) ? "client" : (profile.role as 'client' | 'expert' | 'admin');

    c.set("user", {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role,
    });

    await next();
  } catch (err) {
    console.error("[Auth Middleware Error]:", err);
    return c.json({ error: "Authentication failed" }, 401);
  }
};

// Role authorization guard helper
export function requireRole(allowedRoles: ('client' | 'expert' | 'admin')[]) {
  return async (c: Context<Env>, next: Next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: "Forbidden: Insufficient privileges" }, 403);
    }
    await next();
  };
}
