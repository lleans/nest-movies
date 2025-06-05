import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  async transform(value: unknown, _: ArgumentMetadata) {
    const parsedValue = await this.schema.safeParseAsync(value);
    if (parsedValue.error) {
      const validationErrors = parsedValue.error.errors.map((err: any) => ({
        message: err.message,
        path: err.path.join(','),
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    return parsedValue.data; // Mengembalikan data yang sudah divalidasi
  }
}
