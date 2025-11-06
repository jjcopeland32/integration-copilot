// Sample OpenAPI specifications for testing

export const stripePaymentSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Stripe Payment API',
    version: '1.0.0',
    description: 'Sample Stripe-like payment API for testing',
  },
  servers: [
    {
      url: 'https://api.stripe.com/v1',
    },
  ],
  paths: {
    '/charges': {
      post: {
        summary: 'Create a charge',
        operationId: 'createCharge',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'currency', 'source'],
                properties: {
                  amount: {
                    type: 'integer',
                    description: 'Amount in cents',
                    example: 2000,
                  },
                  currency: {
                    type: 'string',
                    example: 'usd',
                  },
                  source: {
                    type: 'string',
                    description: 'Payment source token',
                    example: 'tok_visa',
                  },
                  description: {
                    type: 'string',
                    example: 'Test charge',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Charge created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'ch_1234567890' },
                    amount: { type: 'integer', example: 2000 },
                    currency: { type: 'string', example: 'usd' },
                    status: { type: 'string', example: 'succeeded' },
                    created: { type: 'integer', example: 1234567890 },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        summary: 'List charges',
        operationId: 'listCharges',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10 },
          },
        ],
        responses: {
          '200': {
            description: 'List of charges',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          amount: { type: 'integer' },
                          currency: { type: 'string' },
                          status: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/customers': {
      post: {
        summary: 'Create a customer',
        operationId: 'createCustomer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email', example: 'customer@example.com' },
                  name: { type: 'string', example: 'John Doe' },
                  description: { type: 'string', example: 'Test customer' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Customer created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'cus_1234567890' },
                    email: { type: 'string' },
                    name: { type: 'string' },
                    created: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

export const todoApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Todo API',
    version: '1.0.0',
    description: 'Simple Todo API for testing',
  },
  servers: [
    {
      url: 'https://api.example.com/v1',
    },
  ],
  paths: {
    '/todos': {
      get: {
        summary: 'Get all todos',
        operationId: 'getTodos',
        responses: {
          '200': {
            description: 'List of todos',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 1 },
                      title: { type: 'string', example: 'Buy groceries' },
                      completed: { type: 'boolean', example: false },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a todo',
        operationId: 'createTodo',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', example: 'New task' },
                  completed: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Todo created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    title: { type: 'string' },
                    completed: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/todos/{id}': {
      get: {
        summary: 'Get a todo by ID',
        operationId: 'getTodoById',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': {
            description: 'Todo found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    title: { type: 'string' },
                    completed: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Todo not found',
          },
        },
      },
      put: {
        summary: 'Update a todo',
        operationId: 'updateTodo',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  completed: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Todo updated',
          },
        },
      },
      delete: {
        summary: 'Delete a todo',
        operationId: 'deleteTodo',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '204': {
            description: 'Todo deleted',
          },
        },
      },
    },
  },
};

export const sampleSpecs = {
  stripe: stripePaymentSpec,
  todo: todoApiSpec,
};
