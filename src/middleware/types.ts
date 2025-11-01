import type { NextRequest } from 'next/server';
import type { SubsequentMiddlewareResponse } from './response';

export type SubsequentMiddleware = {
  name: string;
  matcher: SubsequentMiddlewareMatcher;
  handler: SubsequentMiddlewareHandler;
  options?: SubsequentMiddlewareOptions;
}

export type SubsequentMiddlewareResponseType = ReturnType<(typeof SubsequentMiddlewareResponse)[keyof typeof SubsequentMiddlewareResponse]>;

export type SubsequentMiddlewareHandler = (request: NextRequest, next: SubsequentMiddlewareHandler) => Promise<SubsequentMiddlewareResponseType>;

export type SubsequentStackedMiddlewareHandler = (request: NextRequest) => Promise<SubsequentMiddlewareResponseType>;

export type SubsequentMiddlewareMatcher = string | string[];

export type SubsequentMiddlewareOptions = {
  runtime?: 'node' | 'edge';
};
