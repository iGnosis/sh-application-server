import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/httpexception.filter';
import { CronService } from './services/cron/cron.service';
declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });
  const logger = new Logger(bootstrap.name);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidNonWhitelisted: true, // throw an error if non-whitelisted data is sent
    }),
  );
  const loggerInstance = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(loggerInstance);
  app.useGlobalFilters(new HttpExceptionFilter(loggerInstance));

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local') {
    logger.log('Enabling Swagger APIs UI');
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

  const cronService = app.get(CronService);
  await cronService.reloadActionsMetadata();

  // react to termination signal so we can clean up database connection pool.
  app.enableShutdownHooks();
  const port = process.env.NEST_SERVER_PORT || 9000;
  await app.listen(port);
  logger.log('Started server on port ' + port);
}
bootstrap();
