import { SubsequentMiddleware, SubsequentMiddlewareHandler, SubsequentMiddlewareMatcher, SubsequentMiddlewareOptions } from "./types";

export const createSubsequentMiddleware = (name: string, matcher: SubsequentMiddlewareMatcher, handler: SubsequentMiddlewareHandler, options?: SubsequentMiddlewareOptions): SubsequentMiddleware => {
  return {
    name,
    handler,
    matcher,
    options: {
      ...options,
    },
  };
}