import { z } from "zod";

export const userTypeSchema = z.enum(["superadmin", "customer"]);

export const userStatusSchema = z.enum(["active", "inactive", "pending"]);

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  type: userTypeSchema.optional().default("customer"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url("Invalid avatar URL").optional(),
  status: userStatusSchema.optional(),
  defaultOrganizationId: z.string().optional(),
});

// For superadmin only
export const adminUpdateUserSchema = updateUserSchema.extend({
  type: userTypeSchema.optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
