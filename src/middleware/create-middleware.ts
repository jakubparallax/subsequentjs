import { Middleware, MiddlewareHandler, MiddlewareMatcher } from "./types";

export const createMiddleware = (name: string, matcher: MiddlewareMatcher, handler: MiddlewareHandler): Middleware => {
  return {
    name,
    handler,
    matcher,
  };
}