import { NextRequest } from "next/server";
import { SubsequentMiddleware } from "../middleware";
import { SubsequentStackedMiddlewareHandler } from "../middleware/types";
import { SubsequentMiddlewareResponse } from "../middleware/response";

export const stackMiddlewares = (middlewares: SubsequentMiddleware[], index = 0): SubsequentStackedMiddlewareHandler => {
  const current = middlewares[index];
  if (current) {
    const next = stackMiddlewares(middlewares, index + 1);
    return (request: NextRequest) => current.handler(request, next);
  }
  return async () => SubsequentMiddlewareResponse.next();
}

export const stackNodeMiddlewares = (middlewares: SubsequentMiddleware[]): SubsequentStackedMiddlewareHandler => {}