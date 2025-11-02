import { NextRequest } from "next/server";
import { Middleware } from "../middleware";
import { StackedMiddlewareHandler } from "../middleware/types";
import { middlewareResponse } from "../middleware/response";

/**
 * Stack middleware array into a single recursive middleware handler
 * Injects a next function into the middleware handler, to allow for chaining
 * @param middlewares - The array of middleware to stack
 * @param index - INTERNAL recursion index
 * @returns A single middleware handler that can be called with a NextRequest, and will call middleware until a response or next is returned
 */
export const stackMiddlewares = (middlewares: Middleware[], index = 0): StackedMiddlewareHandler => {
  const current = middlewares[index];
  if (current) {
    const next = stackMiddlewares(middlewares, index + 1);
    return (request: NextRequest) => {
      const response = {...middlewareResponse, next: (request: NextRequest) => next(request)};

      return current.handler(request, response);
    };
  }
  return async () => ({ type: 'next' });
}
