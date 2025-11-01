import type { NextRequest } from 'next/server';
import type { SubsequentMiddlewareResponse } from './response';

export type SubsequentMiddleware = {
  name: string;
  matcher: SubsequentMiddlewareMatcher;
  handler: SubsequentMiddlewareHandler;
  options?: SubsequentMiddlewareOptions;
}

export type SubsequentMiddlewareResponse = ReturnType<(typeof SubsequentMiddlewareResponse)[keyof typeof SubsequentMiddlewareResponse]>;

export type SubsequentMiddlewareHandler = (request: NextRequest, next: SubsequentMiddlewareHandler) => Promise<SubsequentMiddlewareResponse>;

export type SubsequentStackedMiddlewareHandler = (request: NextRequest) => Promise<SubsequentMiddlewareResponse>;

export type SubsequentMiddlewareMatcher = string | string[];

export type SubsequentMiddlewareOptions = {
  runtime?: 'node' | 'edge';
};
