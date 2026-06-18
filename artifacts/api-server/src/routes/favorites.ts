import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { favoriteProductImagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdminAuth } from "../middleware/adminAuth";

const router: IRouter = Router();

router.get("/favorites/images", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(favoriteProductImagesTable);
  const images: Record<string, string> = {};
  for (const row of rows) {
    images[row.productId] = `/api/storage${row.objectPath}`;
  }
  res.json({ images });
});

router.post(
  "/admin/favorites/:productId/image",
  requireAdminAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    const { objectPath } = req.body as { objectPath?: string };
    if (!objectPath || typeof objectPath !== "string" || objectPath.trim() === "") {
      res.status(400).json({ error: "objectPath is required" });
      return;
    }
    await db
      .insert(favoriteProductImagesTable)
      .values({ productId, objectPath })
      .onConflictDoUpdate({
        target: favoriteProductImagesTable.productId,
        set: {
          objectPath,
          updatedAt: new Date(),
        },
      });
    res.json({ success: true, imageUrl: `/api/storage${objectPath}` });
  }
);

router.delete(
  "/admin/favorites/:productId/image",
  requireAdminAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    await db
      .delete(favoriteProductImagesTable)
      .where(eq(favoriteProductImagesTable.productId, productId));
    res.json({ success: true });
  }
);

export default router;
