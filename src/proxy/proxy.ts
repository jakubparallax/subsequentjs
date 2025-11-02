import { NextRequest, NextResponse } from "next/server";
import { Middleware, toNextResponse } from "../middleware";
import type { ProxyHandler } from "./types";
import type { SubsequentConfig } from "../types";
import { handleMiddlewareRequest, isMiddlewareRoute } from "./middleware-route";
import { runEdgeMiddleware, runNodeMiddleware } from "./run-middleware";
import { filterMiddlewaresByPath } from "../utils";

export const createProxyHandler = (edgeMiddlewares: Middleware[], nodeMiddlewares: Middleware[], config: SubsequentConfig, secret: string): ProxyHandler => {
  return async (request: NextRequest) => {
    if (isMiddlewareRoute(request, config)) {
      return await handleMiddlewareRequest(request, secret);
    }

    const matchingEdgeMiddlewares = filterMiddlewaresByPath(edgeMiddlewares, request.nextUrl.pathname);
    const edgeResponse = await runEdgeMiddleware(request, matchingEdgeMiddlewares);

    // Skip node middleware if we're responding
    if (edgeResponse.type !== 'next') return toNextResponse(edgeResponse);
    
    const matchingNodeMiddlewares = filterMiddlewaresByPath(nodeMiddlewares, request.nextUrl.pathname);
    
    if (matchingNodeMiddlewares.length === 0) return NextResponse.next();

    const nodeMiddlewareResult = await runNodeMiddleware(request, matchingNodeMiddlewares, config, secret);

    // Respond with the node middleware result
    return toNextResponse(nodeMiddlewareResult);
  };
}