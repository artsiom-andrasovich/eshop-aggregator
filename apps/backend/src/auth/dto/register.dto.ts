import { registerSchema } from '@eshop/shared';
import { createZodDto } from 'nestjs-zod';

export class RegisterDto extends createZodDto(registerSchema) {}
