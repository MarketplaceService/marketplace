import { HttpStatus } from '@nestjs/common';

export type ApiErrorPayload = {
  succes: false;
  statusCode: number;
  message: string;
  error?: string;
  requestId: string;
  timestamp: string;
  path: string;
};

export type ApiErrorCtx = {
  requestId: string;
  path: string;
};

// Api Error Payload
export function buildApiErrorPayload(
  statusCode: number,
  message: string | string[],
  error: string | undefined,
  ctx: ApiErrorCtx,
): ApiErrorPayload {
  return {
    succes: false,
    statusCode: statusCode,
    message: formatClientErrorMessage(message),
    requestId: ctx.requestId,
    timestamp: new Date().toISOString(),
    path: ctx.path,
    error: error ?? '',
  };
}

type NestHttpErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

//extract error and message from error response
export function extractFromHttpExceptionBody(
  body: Record<string, unknown> | NestHttpErrorBody,
  fallbackMessage: string,
) {
  const b = body as NestHttpErrorBody;

  const message =
    b.message !== undefined
      ? formatClientErrorMessage(b.message)
      : fallbackMessage;

  const error =
    typeof b.error === 'string' && b.error !== '' ? b.error : 'undefined';

  return { message, error };
}

export function payloadFromUnknownException(
  exception: unknown,
  ctx: ApiErrorCtx,
): ApiErrorPayload {
  const prod = (process.env.NODE_ENV = 'production');
  if (exception instanceof Error) {
    return buildApiErrorPayload(
      HttpStatus.INTERNAL_SERVER_ERROR,
      prod ? 'Internal server error' : exception.message,
      'Internal server error',
      ctx,
    );
  }
  return buildApiErrorPayload(
    HttpStatus.INTERNAL_SERVER_ERROR,
    'Internal server error',
    'Internal server error',
    ctx,
  );
}

const formatClientErrorMessage = (message: string | string[]) => {
  if (Array.isArray(message)) {
    return message
      .map((m) => String(m).trim())
      .filter(Boolean)
      .join(' ');
  }
  return String(message);
};
