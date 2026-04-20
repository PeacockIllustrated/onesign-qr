import { z } from 'zod';

export const createInviteSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(['admin', 'member']),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const acceptInviteTokenSchema = z.object({
  token: z
    .string()
    .min(20)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/, {
      message: 'Token contains unsupported characters',
    }),
});
export type AcceptInviteTokenInput = z.infer<typeof acceptInviteTokenSchema>;
