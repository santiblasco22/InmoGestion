import { Request, Response } from "express";
import { z } from "zod";
import * as propertiesService from "../services/properties.service";
import { asyncHandler } from "../middleware/errorHandler";

const propertyBodySchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  address: z.string().min(3),
  neighborhood: z.string().min(1),
  city: z.string().optional(),
  price: z.coerce.number().positive(),
  currency: z.enum(["ARS", "USD"]).optional(),
  type: z.enum(["CASA", "DEPTO", "OFICINA", "PH", "LOCAL", "TERRENO"]),
  status: z.enum(["DISPONIBLE", "RESERVADO", "VENDIDO", "ALQUILADO"]).optional(),
  rooms: z.coerce.number().int().min(0),
  bathrooms: z.coerce.number().int().min(0),
  area: z.coerce.number().positive(),
  amenities: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v) : v),
    z.array(z.string()).optional()
  ),
});

const listQuerySchema = z.object({
  status: z.enum(["DISPONIBLE", "RESERVADO", "VENDIDO", "ALQUILADO"]).optional(),
  type: z.enum(["CASA", "DEPTO", "OFICINA", "PH", "LOCAL", "TERRENO"]).optional(),
  neighborhood: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  currency: z.enum(["ARS", "USD"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/** GET /api/properties */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const filters = listQuerySchema.parse(req.query);
  const result = await propertiesService.listProperties(req.user.id, filters);
  res.json(result);
});

/** GET /api/properties/:id */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const property = await propertiesService.getProperty(req.params.id, req.user.id);
  res.json(property);
});

/** POST /api/properties */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = propertyBodySchema.parse(req.body);
  const files = req.files as Express.Multer.File[] | undefined;
  const property = await propertiesService.createProperty(req.user.id, input, files);
  res.status(201).json(property);
});

/** PUT /api/properties/:id */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = propertyBodySchema.partial().parse(req.body);
  const property = await propertiesService.updateProperty(req.params.id, req.user.id, input);
  res.json(property);
});

/** DELETE /api/properties/:id */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await propertiesService.deleteProperty(req.params.id, req.user.id);
  res.status(204).send();
});

/** POST /api/properties/:id/photos */
export const addPhotos = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files?.length) {
    return res.status(400).json({ error: { message: "No se enviaron archivos" } });
  }
  const photos = await propertiesService.addPhotos(req.params.id, req.user.id, files);
  res.json({ photos });
});

/** DELETE /api/properties/:id/photos/:photoKey */
export const removePhoto = asyncHandler(async (req: Request, res: Response) => {
  const photoKey = decodeURIComponent(req.params.photoKey);
  const photos = await propertiesService.removePhoto(req.params.id, req.user.id, photoKey);
  res.json({ photos });
});
