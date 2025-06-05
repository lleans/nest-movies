import { z } from 'zod';

export const bulkDeleteSchema = z.object({
  ids: z
    .array(
      z
        .number()
        .int({ message: 'Each ID must be an integer.' })
        .positive({ message: 'Each ID must be a positive number.' }),
    )
    .min(1, { message: 'At least one ID must be provided for bulk deletion.' }),
});

export type BulkDeleteDto = z.infer<typeof bulkDeleteSchema>;
