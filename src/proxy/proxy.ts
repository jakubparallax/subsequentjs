import { NextRequest, NextResponse } from "next/server";
import { SubsequentMiddleware, toNextResponse } from "../middleware";
import type { ProxyHandler } from "./types";
import type { SubsequentStackConfig } from "../types";
import { handleSubsequentMiddlewareRequest, isSubsequentMiddlewareRoute } from "./middleware-route";
import { stackMiddlewares } from "../utils";
import { generateSubrequestToken } from "./subrequest-token";

export const createProxyHandler = (middlewares: SubsequentMiddleware[], config: SubsequentStackConfig, secret: string): ProxyHandler => {
  return async (request: NextRequest) => {
    if (isSubsequentMiddlewareRoute(request, config)) {
      return await handleSubsequentMiddlewareRequest(request, secret);
    }

    const matchingMiddleware = middlewares.filter((middleware) => middleware.matcher === request.nextUrl.pathname);
    
    const edgeMiddleware = matchingMiddleware.filter((middleware) => middleware.options?.runtime === 'edge');
    const edgeMiddlewareHandler = stackMiddlewares(edgeMiddleware);
    
    const edgeResponse = await edgeMiddlewareHandler(request);

    if (edgeResponse.type !== 'next') {
      return toNextResponse(edgeResponse);
    }
    
    const nodeMiddleware = matchingMiddleware.filter((middleware) => middleware.options?.runtime === 'node');
    if (nodeMiddleware.length === 0) {
      return NextResponse.next();
    }
    
    const middlewareHeader = nodeMiddleware.map((middleware) => middleware.name).join(',');
    const body = await request.text();

    const middlewareToken = generateSubrequestToken(body, secret);

    const nodeMiddlewareResponse = await fetch(new URL(config.apiBasePath, request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
        'x-subsequentjs-middleware-token': middlewareToken,
        'x-subsequentjs-middleware': middlewareHeader,
      },
      body,
    });

    if (!nodeMiddlewareResponse.ok) {
      return NextResponse.json({ error: 'Failed to call middleware' }, { status: 500 });
    }

    const nodeMiddlewareResult = await nodeMiddlewareResponse.json();

    return toNextResponse(nodeMiddlewareResult);
  };
}