import { z } from 'zod';

export const orgSwitchSchema = z.object({
  orgId: z.string().uuid(),
});
export type OrgSwitchInput = z.infer<typeof orgSwitchSchema>;
