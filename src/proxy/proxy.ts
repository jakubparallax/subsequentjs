import { NextRequest, NextResponse } from "next/server";
import { SubsequentMiddleware } from "../middleware";
import type { ProxyHandler } from "./types";
import type { SubsequentStackConfig } from "../types";
import { handleSubsequentMiddlewareRequest, isSubsequentMiddlewareRoute } from "./middleware-route";
import { stackMiddlewares } from "../utils";

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
      //TODO: Handle subsequent middleware response
      // return edgeResponse;
    }
    
    const nodeMiddleware = matchingMiddleware.filter((middleware) => middleware.options?.runtime === 'node');


    return NextResponse.next();
  };
}