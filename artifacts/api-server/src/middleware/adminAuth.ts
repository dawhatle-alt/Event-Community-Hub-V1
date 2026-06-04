import type { Request, Response, NextFunction } from "express";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_PASSWORD) {
    res.status(503).json({ error: "Admin access is not configured. Set the ADMIN_PASSWORD environment variable." });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== ADMIN_PASSWORD) {
    res.status(403).json({ error: "Invalid admin credentials" });
    return;
  }

  next();
}
