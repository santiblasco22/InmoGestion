import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

/** GET /api/public/properties/:id — no auth required */
router.get("/properties/:id", asyncHandler(async (req: Request, res: Response) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, title: true, description: true, address: true,
      neighborhood: true, city: true, price: true, currency: true,
      type: true, status: true, rooms: true, bathrooms: true,
      area: true, amenities: true, photos: true, createdAt: true,
      agent: { select: { name: true, phone: true, email: true } },
    },
  });

  if (!property) {
    res.status(404).json({ error: { message: "Propiedad no encontrada" } });
    return;
  }

  res.json(property);
}));

export default router;
