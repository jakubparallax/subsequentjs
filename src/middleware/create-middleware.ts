import { SubsequentMiddleware, SubsequentMiddlewareHandler, SubsequentMiddlewareMatcher, SubsequentMiddlewareOptions } from "./types";

const defaultOptions: SubsequentMiddlewareOptions = {
  runtime: 'node',
}

export const createSubsequentMiddleware = (name: string, matcher: SubsequentMiddlewareMatcher, handler: SubsequentMiddlewareHandler, options?: SubsequentMiddlewareOptions): SubsequentMiddleware => {
  const fullOptions = {
    ...defaultOptions,
    ...options,
  }
  
  return {
    name,
    handler,
    matcher,
    options: fullOptions,
  };
}