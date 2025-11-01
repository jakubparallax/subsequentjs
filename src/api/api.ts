import type { ApiHandler } from "./types";
import { SubsequentMiddleware } from "../middleware";
import { NextRequest, NextResponse } from "next/server";
import { SubsequentStackConfig } from "../types";
import { stackMiddlewares } from "../utils";



export const createApiHandler = (middlewares: SubsequentMiddleware[], config: SubsequentStackConfig): ApiHandler => {
  return async (request: NextRequest) => {
    const requestedMiddlewareHeader = request.headers.get('x-subsequentjs-middleware');
    if (!requestedMiddlewareHeader) {
      return NextResponse.json({ error: 'Middleware not found' }, { status: 404 });
    }

    const requestedMiddlewareNames = requestedMiddlewareHeader.split(',');

    const requestedMiddlewares = middlewares.filter((middleware) => requestedMiddlewareNames.includes(middleware.name));

    if (requestedMiddlewares.length === 0) {
      return NextResponse.json({ error: 'No middleware found' }, { status: 404 });
    }

    const middlewareStack = stackMiddlewares(requestedMiddlewares);

    const response = await middlewareStack(request);

    return NextResponse.json(response);
  };
}