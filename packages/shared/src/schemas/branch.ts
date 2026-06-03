import { z } from "zod";

export const branchSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  address: z.string().nullable(),
  postcode: z.string().nullable(),
  phone: z.string().nullable(),
  listings_this_month: z.number().int().min(0),
  monthly_listing_limit: z.number().int().min(0).nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type Branch = z.infer<typeof branchSchema>;

export const createBranchSchema = branchSchema
  .pick({ name: true, address: true, postcode: true, phone: true })
  .extend({
    name: z.string().min(1).max(120),
  });
export type CreateBranchRequest = z.infer<typeof createBranchSchema>;
