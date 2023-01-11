import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { HttpErrorWithReason } from 'src/types/global';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const hasuraErrorResponseStatus = 400;

    this.logger.error(exception);
    if (typeof exception.getResponse() == 'string') {
      response.status(hasuraErrorResponseStatus).json({
        message: exception.getResponse(),
        extensions: {
          statusCode: status,
          path: request.url,
        },
      });
    } else if (typeof exception.getResponse() === 'object') {
      const { msg: message, reason } = exception.getResponse() as HttpErrorWithReason;
      response.status(status).json({
        message,
        extensions: {
          statusCode: status,
          path: request.url,
          reason,
        },
      });
    }
  }
}
