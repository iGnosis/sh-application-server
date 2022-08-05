import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/httpexception.filter';
declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidNonWhitelisted: true, // throw an error if non-whitelisted data is sent
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  if (process.env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Point Motion API')
      .setDescription('Custom APIs for Point Motion')
      .setVersion('1.0')
      .addBearerAuth(
        {
          // I was also testing it without prefix 'Bearer ' before the JWT
          description: `Please enter the JWT token`,
          name: 'Authorization',
          bearerFormat: 'Bearer',
          scheme: 'Bearer',
          type: 'http',
          in: 'Header',
        },
        'access-token', // This name here is important for matching up with @ApiBearerAuth() in your controller!
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }

  // react to termination signal so we can clean up database connection pool.
  app.enableShutdownHooks();
  const port = 9000;
  await app.listen(port);
  console.log('Started server on port ' + port);
}
bootstrap();
