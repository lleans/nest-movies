import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { z, ZodSchema } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  let pipe: ZodValidationPipe;

  beforeEach(async () => {
    const schema: ZodSchema<any> = z.object({
      name: z.string(),
    });

    pipe = new ZodValidationPipe(schema);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should validate input', async () => {
    const value = { name: 'John' };
    const metadata: ArgumentMetadata = { type: 'body' };

    const result = await pipe.transform(value, metadata);
    expect(result).toEqual(value);
  });

  it('should throw BadRequestException for invalid input', async () => {
    const value = { name: 123 };
    const metadata: ArgumentMetadata = { type: 'body' };

    await expect(pipe.transform(value, metadata)).rejects.toThrow(
      BadRequestException,
    );
  });
});
