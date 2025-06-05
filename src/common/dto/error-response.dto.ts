/**
 * Common error response schemas for API documentation
 */

// Base error response interface
export interface ErrorResponse {
  success: boolean;
  message: string;
  errors?: any[];
}

// Utility function to customize error schema messages
export function createErrorSchema(
  baseSchema: any,
  customMessage?: string,
): any {
  if (!customMessage) return baseSchema;

  return {
    ...baseSchema,
    properties: {
      ...baseSchema.properties,
      message: {
        ...baseSchema.properties.message,
        example: customMessage,
      },
    },
  };
}

// Common error response schemas for OpenAPI documentation
export const CommonErrorSchemas = {
  // 400 Bad Request - Validation errors
  ValidationError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Validation failed' },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Field validation error message',
            },
            path: { type: 'string', example: 'fieldName' },
          },
        },
      },
    },
  },

  // 401 Unauthorized
  Unauthorized: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Unauthorized access' },
    },
  },

  // 403 Forbidden
  Forbidden: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Access forbidden' },
    },
  },

  // 404 Not Found
  NotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Resource not found' },
    },
  },

  // 409 Conflict
  Conflict: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Resource conflict' },
    },
  },

  // 422 Unprocessable Entity
  UnprocessableEntity: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Unable to process request' },
    },
  },

  // 500 Internal Server Error
  InternalServerError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Internal server error' },
    },
  },

  // Generic bulk operation error
  BulkOperationError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: {
        type: 'string',
        example: 'Invalid input data or At least one ID must be provided.',
      },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            path: {
              type: 'array',
              items: { type: 'string', example: 'ids' },
            },
          },
        },
      },
    },
  },
};

// Specific error schemas for orders
export const OrderErrorSchemas = {
  OrderNotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Order not found' },
    },
  },

  OrderUnauthorized: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'You can only view your own orders' },
    },
  },

  SeatNotAvailable: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: {
        type: 'string',
        example: 'One or more selected seats are no longer available',
      },
    },
  },

  ScheduleNotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Movie schedule not found' },
    },
  },

  ScheduleExpired: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: {
        type: 'string',
        example: 'Cannot book tickets for past schedule',
      },
    },
  },

  InvalidOrderStatus: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Invalid order status transition' },
    },
  },
};

// Specific error schemas for movie schedules
export const MovieScheduleErrorSchemas = {
  ScheduleNotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Movie schedule not found' },
    },
  },

  MovieNotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Movie not found' },
    },
  },

  StudioNotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Studio not found' },
    },
  },

  ScheduleConflict: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: {
        type: 'string',
        example: 'Schedule conflicts with existing booking',
      },
    },
  },

  InvalidDateTime: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Invalid date or time format' },
    },
  },

  CannotDeleteSchedule: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: {
        type: 'string',
        example: 'Cannot delete schedule with existing bookings',
      },
    },
  },
};

// Specific error schemas for studios
export const StudioErrorSchemas = {
  StudioNotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Studio not found' },
    },
  },

  StudioNumberConflict: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: {
        type: 'string',
        example: 'Studio with number 1 already exists',
      },
    },
  },
};

// Specific error schemas for seats
export const SeatErrorSchemas = {
  SeatNotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Seat not found' },
    },
  },

  SeatConflict: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: {
        type: 'string',
        example: 'Seat A1 already exists in studio 1',
      },
    },
  },
};

// Specific error schemas for movies
export const MovieErrorSchemas = {
  MovieNotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Movie with ID 123 not found' },
    },
  },
};

// Specific error schemas for tags
export const TagErrorSchemas = {
  TagNotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Tag with ID 123 not found' },
    },
  },

  TagSlugNotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: {
        type: 'string',
        example: 'Tag with slug "example" not found',
      },
    },
  },

  TagInUse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: {
        type: 'string',
        example: 'Cannot delete tag that is currently associated with movies',
      },
    },
  },
};

// Specific error schemas for users
export const UserErrorSchemas = {
  UserNotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'User not found' },
    },
  },

  EmailConflict: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Email already exists' },
    },
  },

  InvalidPassword: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Current password is incorrect' },
    },
  },
};

// Specific error schemas for authentication
export const AuthErrorSchemas = {
  InvalidCredentials: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Invalid credentials' },
    },
  },

  UserExists: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'User already exists' },
    },
  },

  InvalidToken: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Invalid refresh token' },
    },
  },
};

// Specific error schemas for file uploads
export const UploadErrorSchemas = {
  NoFileProvided: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'No file provided' },
    },
  },

  InvalidFileType: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: {
        type: 'string',
        example:
          'Invalid file type. Allowed types are: image/jpeg, image/png...',
      },
    },
  },

  UploadFailed: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Upload failed: Error message' },
    },
  },
};
