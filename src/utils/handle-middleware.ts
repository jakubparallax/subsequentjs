import { NextRequest } from "next/server";
import { Middleware } from "../middleware";
import { StackedMiddlewareHandler } from "../middleware/types";
import { middlewareResponse } from "../middleware/response";

export const stackMiddlewares = (middlewares: Middleware[], index = 0): StackedMiddlewareHandler => {
  const current = middlewares[index];
  if (current) {
    const next = stackMiddlewares(middlewares, index + 1);
    return (request: NextRequest) => current.handler(request, next);
  }
  return async () => middlewareResponse.next();
}
