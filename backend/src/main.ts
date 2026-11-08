import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Sequelize } from 'sequelize-typescript';

import { AppModule } from './app.module';
import { runMigrations } from './database/migrate';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableShutdownHooks();

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        }),
    );

    const swaggerConfig = new DocumentBuilder()
        .setTitle('Mizara API')
        .setDescription('API documentation for the Mizara backend')
        .setVersion('0.0.1')
        .addBearerAuth()
        .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument, {
        customSiteTitle: 'Mizara API Docs',
    });

    await runMigrations(app.get(Sequelize));

    await app.listen(process.env.PORT ?? 3000);
    Logger.log(`Application is running on: ${await app.getUrl()}`);
    Logger.log(`Swagger docs available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
