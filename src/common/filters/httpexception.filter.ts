import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const hasuraErrorResponseStatus = 400;

    if (typeof exception.getResponse() == 'string') {
      this.logger.error(exception);
      response.status(hasuraErrorResponseStatus).json({
        message: exception.getResponse(),
        extensions: {
          statusCode: status,
          path: request.url,
        },
      });
    } else {
      response.status(status).json(exception.getResponse());
    }
  }
}
