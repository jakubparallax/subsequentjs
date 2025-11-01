import type { NextRequest } from 'next/server';
import type { MiddlewareResponseType } from './response';

export type Middleware = {
  name: string;
  matcher: MiddlewareMatcher;
  handler: MiddlewareHandler;
}

export type MiddlewareHandler = (request: NextRequest, next: MiddlewareHandler) => Promise<MiddlewareResponseType>;

export type StackedMiddlewareHandler = (request: NextRequest) => Promise<MiddlewareResponseType>;

export type MiddlewareMatcher = string | string[];
