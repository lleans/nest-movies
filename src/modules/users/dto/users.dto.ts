import { PaginationQuerySchema } from '@app/common/dto/pagination.dto';
import { z } from 'zod';

// Update Password DTO
export const UpdatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      ),
    password_confirmation: z
      .string()
      .min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.password_confirmation, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type UpdatePasswordDto = z.infer<typeof UpdatePasswordSchema>;

// Update Avatar DTO
export const UpdateAvatarSchema = z.object({
  avatar: z.string().url('Avatar must be a valid URL').optional(),
});

export type UpdateAvatarDto = z.infer<typeof UpdateAvatarSchema>;

// Update Profile DTO
export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

// User Response DTO
export interface UserResponseDto {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  isAdmin: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Update responses
export interface UpdatePasswordResponseDto {
  message: string;
}

export interface UpdateAvatarResponseDto {
  message: string;
  avatar?: string;
}

export interface UpdateProfileResponseDto extends UserResponseDto {
  message: string;
}

// Get Users Query DTO (extends pagination)
export const GetUsersQuerySchema = PaginationQuerySchema.extend({
  isAdmin: z
    .string()
    .optional()
    .transform((val) => (val ? val === 'true' : undefined)),
  email: z.string().email().optional(),
  name: z.string().optional(),
  includeDeleted: z
    .string()
    .optional()
    .transform((val) => (val ? val === 'true' : undefined)),
});

export type GetUsersQueryDto = z.infer<typeof GetUsersQuerySchema>;

// Create User DTO (for admin use)
export const CreateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters'),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    ),
  isAdmin: z.coerce.boolean().optional().default(false),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

// Admin Update User DTO (for admin use - includes password field)
export const AdminUpdateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    )
    .optional(),
  isAdmin: z.coerce.boolean().optional(),
  recover: z.coerce.boolean().default(false),
});

export type AdminUpdateUserDto = z.infer<typeof AdminUpdateUserSchema>;
