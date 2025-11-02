import type { ApiHandler } from "./types";
import { Middleware } from "../middleware";
import { NextRequest, NextResponse } from "next/server";
import { SubsequentConfig } from "../types";
import { stackMiddlewares } from "../utils";

export const createApiHandler = (middlewares: Middleware[], _config: SubsequentConfig): ApiHandler => {
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

    try {
      const originalUrl = request.headers.get('x-subsequentjs-forwarded-url');
      const originalMethod = request.headers.get('x-subsequentjs-forwarded-method');
      if (!originalUrl || !originalMethod) {
        return NextResponse.json({ error: 'Original URL or method not found' }, { status: 400 });
      }

      const originalRequest = new NextRequest(originalUrl, { method: originalMethod, headers: request.headers, body: !['GET', 'HEAD'].includes(originalMethod) ? request.body : null })

      const response = await middlewareStack(originalRequest);
  
      return NextResponse.json(response);
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  };
}