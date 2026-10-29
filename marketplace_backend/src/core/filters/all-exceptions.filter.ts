import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CORRELATION_ID_HEADER } from 'src/shared/constants/correlation-id';
import {
  buildApiErrorPayload,
  extractFromHttpExceptionBody,
  payloadFromUnknownException,
} from 'src/shared/helpers/api-error-response';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionFilter.name);
  }
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') return;

    const httpCtx = host.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();

    const ctx = {
      requestId: (req.headers[CORRELATION_ID_HEADER] as string) ?? '',
      path: req.url,
    };

    //http exceptions (NotFoundException, BadRequestException...)
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const rawErrorResponse = exception.getResponse();

      if (typeof rawErrorResponse === 'string') {
        // todo: build error payload
        res
          .status(statusCode)
          .json(
            buildApiErrorPayload(statusCode, rawErrorResponse, undefined, ctx),
          );
        return;
      }

      //resBody is an object
      // todo: extract error from body
      const { message, error } = extractFromHttpExceptionBody(
        rawErrorResponse,
        exception.message,
      );

      // todo: build error payload
      res
        .status(statusCode)
        .json(buildApiErrorPayload(statusCode, message, error, ctx));
      return;
    }

    //unknow exceptions (database errors, 500 server errors ...)
    this.logger.error({
      msg: 'unhandled.exception',
      requestId: ctx.requestId,
      path: ctx.path,
      error:
        exception instanceof Error ? exception.message : 'Unknow exception',
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // todo: build error payload for unknow exceptions
    const payload = payloadFromUnknownException(exception, ctx);
    res.status(payload.statusCode).json(payload);
    return;
  }
}
