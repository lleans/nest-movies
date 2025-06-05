import { z } from 'zod';

export const SiginInDto = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters long')
    .max(100, 'Email can be at most 100 characters'),

  password: z.string(),
  // TODO: Uncomment and adjust password validation as needed
  // .min(8, 'Password must be at least 8 characters long')
  // .max(32, 'Password can be at most 32 characters')
  // .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  // .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  // .regex(/[0-9]/, 'Password must contain at least one number')
  // .regex(
  //   /[!@#$%^&*()]/,
  //   'Password must contain at least one special character',
  // ),
});

export const SignUpDto = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters long')
      .max(50, 'Name can be at most 50 characters')
      .regex(/^[a-zA-Z\s]*$/, 'Name can only contain letters'),

    email: z
      .string()
      .email('Invalid email format')
      .min(5, 'Email must be at least 5 characters long')
      .max(100, 'Email can be at most 100 characters'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(32, 'Password can be at most 32 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[!@#$%^&*()]/,
        'Password must contain at least one special character',
      ),

    password_confirmation: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(32, 'Password can be at most 32 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[!@#$%^&*()]/,
        'Password must contain at least one special character',
      ),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Password and password confirmation must match',
    path: ['password_confirmation'],
  });

export type SignUpInput = z.infer<typeof SignUpDto>;
export type SignInInput = z.infer<typeof SiginInDto>;
