import { Context } from "hono";

export async function errorHandler(err: Error, c: Context) {
  console.error(`[Error Handler]: ${err.stack || err.message}`);
  
  const status = (err as any).status || 500;
  return c.json({
    error: err.message || "Internal Server Error",
    status,
    timestamp: new Date().toISOString()
  }, status);
}
