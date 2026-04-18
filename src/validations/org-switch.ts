import { z } from 'zod';

export const switchOrgSchema = z.object({
  orgId: z.string().uuid(),
});
export type SwitchOrgInput = z.infer<typeof switchOrgSchema>;
