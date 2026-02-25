import { z } from "zod";

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
