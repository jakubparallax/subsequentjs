import { NextRequest, NextResponse } from "next/server";
import { Middleware, toNextResponse } from "../middleware";
import type { ProxyHandler } from "./types";
import type { SubsequentConfig } from "../types";
import { handleMiddlewareRequest, isMiddlewareRoute } from "./middleware-route";
import { stackMiddlewares } from "../utils";
import { generateSubrequestToken } from "./subrequest-token";

export const createProxyHandler = (edgeMiddlewares: Middleware[], nodeMiddlewares: Middleware[], config: SubsequentConfig, secret: string): ProxyHandler => {
  return async (request: NextRequest) => {
    if (isMiddlewareRoute(request, config)) {
      return await handleMiddlewareRequest(request, secret);
    }

    const matchingEdgeMiddlewares = edgeMiddlewares.filter((middleware) => middleware.matcher === request.nextUrl.pathname);
    const edgeMiddlewareHandler = stackMiddlewares(matchingEdgeMiddlewares);
    
    const edgeResponse = await edgeMiddlewareHandler(request);

    if (edgeResponse.type !== 'next') {
      return toNextResponse(edgeResponse);
    }
    
    const matchingNodeMiddlewares = nodeMiddlewares.filter((middleware) => middleware.matcher === request.nextUrl.pathname);

    if (matchingNodeMiddlewares.length === 0) {
      return NextResponse.next();
    }
    
    const middlewareHeader = matchingNodeMiddlewares.map((middleware) => middleware.name).join(',');
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