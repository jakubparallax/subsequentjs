import type { ApiHandler } from "./types";
import { Middleware } from "../middleware";
import { NextRequest, NextResponse } from "next/server";
import { SubsequentConfig } from "../types";
import { createOriginalRequestFromForwarded, stackMiddlewares } from "../utils";

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

    const nodeMiddlewareHandler = stackMiddlewares(requestedMiddlewares);

    try {
      // Use the forwarded request headers to reconstruct the original request
      const originalRequest = createOriginalRequestFromForwarded(request);

      const response = await nodeMiddlewareHandler(originalRequest);

      // Respond with the subsequent response object, to be converted to a NextResponse by the proxy
      return NextResponse.json(response);
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  };
}