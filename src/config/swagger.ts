import swaggerJsDoc from 'swagger-jsdoc';
import { Application, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

const PORT = process.env.PORT || 3000;

const swaggerOptions: swaggerJsDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Progress Management API',
      version: '1.0.0',
      description:
        'RESTful API Documentation for Progress Management Backend (Kanban, Projects, Boards, Tasks, Users)',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api/v1`,
        description: 'Development Server (API v1)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' },
            meta: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message description' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Invalid email address' },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '1' },
            username: { type: 'string', example: 'johndoe' },
            email: { type: 'string', format: 'email', example: 'johndoe@example.com' },
            avatarUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://example.com/avatar.png',
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateUserRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', example: 'johndoe', minLength: 3, maxLength: 100 },
            email: { type: 'string', format: 'email', example: 'johndoe@example.com' },
            password: { type: 'string', format: 'password', example: 'secret123', minLength: 6 },
            avatarUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/avatar.png',
            },
          },
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            username: { type: 'string', example: 'john_updated', minLength: 3, maxLength: 100 },
            avatarUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/new-avatar.png',
            },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', format: 'password', example: 'oldSecret123' },
            newPassword: {
              type: 'string',
              format: 'password',
              example: 'newSecret456',
              minLength: 6,
            },
          },
        },
      },
    },
  },
  apis: [
    './src/routes/**/*.ts',
    './src/modules/**/*.routes.ts',
    './src/modules/**/*.swagger.ts',
  ],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

export const setupSwagger = (app: Application): void => {
  // Swagger UI page
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Progress Management API Docs',
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );

  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

export default setupSwagger;

