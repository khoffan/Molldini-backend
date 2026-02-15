import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'E-Commerce API Docs',
            version: '1.0.0',
            description: 'เอกสารประกอบ API สำหรับระบบ E-Commerce',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 3000}`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        role: { type: 'string', enum: ['USER', 'MERCHANT', 'ADMIN'] },
                        lastLogin: { type: 'string', format: 'date-time' }
                    }
                }
            }
        },
    },
    // ชี้ไปที่ไฟล์ Route ทั้งหมดของคุณเพื่ออ่าน Annotation
    apis: ['./src/routes/*.ts', './src/webhook/*.ts', './index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);