import { NextRequest } from "next/server";
import { Middleware } from "../middleware";
import { StackedMiddlewareHandler } from "../middleware/types";
import { middlewareResponse, MiddlewareResponseType } from "../middleware/response";

export const stackMiddlewares = (middlewares: Middleware[], index = 0): StackedMiddlewareHandler => {
  const current = middlewares[index];
  if (current) {
    const next = stackMiddlewares(middlewares, index + 1);
    return (request: NextRequest) => {
      const response = {next: (request: NextRequest) => next(request), ...middlewareResponse};
      
      return current.handler(request, response);
    };
  }
  return async () => ({ type: 'next' });
}
