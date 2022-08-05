import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const hasuraErrorResponseStatus = 400;

    if (typeof exception.getResponse() == 'string') {
      response.status(hasuraErrorResponseStatus).json({
        message: exception.getResponse(),
        extensions: {
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      });
    } else {
      response.status(status).json(exception.getResponse());
    }
  }
}
