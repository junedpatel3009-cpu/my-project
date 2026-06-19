import { z } from "zod";

export const registerSchema = z.object({
  role: z.enum(["CLIENT", "PROFESSIONAL"]),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export const clientCreateSchema = z.object({
  userId: z.number().int().positive().optional(),
  companyName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(240).optional().nullable(),
  industry: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const clientUpdateSchema = clientCreateSchema.partial().omit({ userId: true });

export const professionalCreateSchema = z.object({
  userId: z.number().int().positive().optional(),
  displayName: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  hourlyRate: z.number().int().nonnegative().max(100000).optional().nullable(),
  experienceYears: z.number().int().nonnegative().max(80).optional().nullable(),
  bio: z.string().trim().max(1500).optional().nullable(),
  verificationStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const professionalUpdateSchema = professionalCreateSchema.partial().omit({ userId: true });

export const locationCreateSchema = z.object({
  userId: z.number().int().positive().optional(),
  ownerType: z.enum(["CLIENT", "PROFESSIONAL"]).optional(),
  label: z.string().trim().min(2).max(120),
  address: z.string().trim().min(2).max(240),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().int().positive().max(500).optional().nullable(),
  isPrimary: z.boolean().optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
});

export const locationUpdateSchema = locationCreateSchema.partial().omit({ userId: true, ownerType: true });

export const distanceSchema = z.object({
  from: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  to: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export const storageFileCreateSchema = z.object({
  userId: z.number().int().positive().optional(),
  ownerType: z.enum(["CLIENT", "PROFESSIONAL"]).optional(),
  ownerId: z.number().int().positive().optional().nullable(),
  folder: z.string().trim().min(1).max(120).default("general"),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(3).max(120),
  sizeBytes: z.number().int().positive().max(200 * 1024 * 1024),
  accessLevel: z.enum(["PRIVATE", "PUBLIC"]).optional(),
  checksum: z.string().trim().max(160).optional().nullable(),
});

export const storageFileUpdateSchema = storageFileCreateSchema
  .partial()
  .omit({ userId: true, ownerType: true, ownerId: true })
  .extend({
    status: z.enum(["PENDING", "READY", "ARCHIVED"]).optional(),
  });

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };

  return {
    ok: false,
    details: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}
