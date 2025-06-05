import { configuredMulterAllowedFileTypes } from '@app/common/config/storage.config'; // Ensure this path alias @app is correct or use relative path
import { z } from 'zod';

export const UploadFileSchema = z.object({
  file: z.any().refine(
    (file) => {
      if (!file || typeof file.mimetype !== 'string') {
        // Ensure file and mimetype exist and mimetype is a string
        return false;
      }
      return configuredMulterAllowedFileTypes.includes(file.mimetype);
    },
    {
      message: `Invalid file type. Allowed types are: ${configuredMulterAllowedFileTypes.join(', ')}`,
    },
  ),
});

export type UploadFileDto = z.infer<typeof UploadFileSchema>;

export interface FileUploadResponse {
  message: string;
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  isExisting: boolean;
}
