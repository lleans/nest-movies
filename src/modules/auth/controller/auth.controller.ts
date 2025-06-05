import {
  GetCurrentUser,
  RequestInfo,
} from '@app/common/decorator/current-user.decorator';
import { Public } from '@app/common/decorator/public.decorator';
import {
  AuthErrorSchemas,
  CommonErrorSchemas,
} from '@app/common/dto/error-response.dto';
import { ZodValidationPipe } from '@app/common/pipes/zod-validation/zod-validation.pipe';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  SiginInDto,
  SignInInput,
  SignUpDto,
  SignUpInput,
} from '../dto/auth.dto';
import { JWTRefreshGuard } from '../guards/jwt-refresh.guard';
import { AuthService } from '../service/auth.service';

@ApiTags('Authorization')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully created',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User successfully created' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'johndoe' },
              },
            },
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already exists',
    schema: AuthErrorSchemas.UserExists,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
    schema: CommonErrorSchemas.ValidationError,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'password', 'password_confirmation'],
      properties: {
        name: {
          type: 'string',
          example: 'johndoe',
          minLength: 2,
          maxLength: 50,
          pattern: '^[a-zA-Z\\s]*$',
        },
        email: {
          type: 'string',
          format: 'email',
          example: 'user@example.com',
          minLength: 5,
          maxLength: 100,
        },
        password: {
          type: 'string',
          example: 'StrongPassword123!',
          minLength: 8,
          maxLength: 32,
          description:
            'Must contain uppercase, lowercase, number, and special character',
        },
        password_confirmation: {
          type: 'string',
          example: 'StrongPassword123!',
          description: 'Must match password field',
        },
      },
    },
  })
  async signUp(
    @Body(new ZodValidationPipe(SignUpDto)) signUpDto: SignUpInput,
    @GetCurrentUser('requestInfo') userInfo: RequestInfo,
  ) {
    return await this.authService.signUp(signUpDto, userInfo);
  }

  @Public
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully authenticated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OK' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'johndoe' },
              },
            },
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
    schema: AuthErrorSchemas.InvalidCredentials,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
    schema: CommonErrorSchemas.ValidationError,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'user@example.com',
          minLength: 5,
          maxLength: 100,
        },
        password: {
          type: 'string',
          example: 'StrongPassword123!',
        },
      },
    },
  })
  async signIn(
    @Body(new ZodValidationPipe(SiginInDto)) signInDto: SignInInput,
    @GetCurrentUser('requestInfo') userInfo: RequestInfo,
  ) {
    return await this.authService.signIn(
      signInDto.email,
      signInDto.password,
      userInfo,
    );
  }

  @JWTRefreshGuard
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token successfully refreshed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OK' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'johndoe' },
              },
            },
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token',
    schema: AuthErrorSchemas.InvalidToken,
  })
  async refreshToken(
    @GetCurrentUser('token') refreshToken: string,
    @GetCurrentUser('requestInfo') requestInfo: RequestInfo,
  ) {
    return await this.authService.refreshToken(refreshToken, requestInfo);
  }

  @Post('logout')
  @JWTRefreshGuard
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user and invalidate token using refresh token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged out',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Successfully logged out' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
    schema: CommonErrorSchemas.Unauthorized,
  })
  async logout(
    @GetCurrentUser('id') userId: number,
    @GetCurrentUser('token') refreshToken?: string,
  ) {
    await this.authService.logout(userId, refreshToken);
    return {
      message: 'Successfully logged out',
    };
  }
}
