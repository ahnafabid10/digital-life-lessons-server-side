const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Digital Life Lessons API',
    description: 'Digital Life Lessons Backend API',
  },

  host: 'localhost:3000',

  schemes: ['http'],

  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description:
        'Enter token like this: Bearer <your_firebase_token>',
    },
  },
};

const outputFile = './swagger.json';

const endpointsFiles = ['./index.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);