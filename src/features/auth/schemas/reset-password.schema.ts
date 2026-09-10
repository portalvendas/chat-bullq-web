import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres').max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
