import { NextRequest } from "next/server";
import { Middleware } from "../middleware";
import { buildMiddlewareApiUrl, createForwardingRequest, stackMiddlewares } from "../utils";
import { SubsequentConfig } from "../types";

export const runEdgeMiddleware = async (request: NextRequest, edgeMiddlewares: Middleware[]) => {
  const edgeMiddlewareHandler = stackMiddlewares(edgeMiddlewares);
  const edgeResponse = await edgeMiddlewareHandler(request);
  
  return edgeResponse;
}

export const runNodeMiddleware = async (request: NextRequest, nodeMiddlewares: Middleware[], config: SubsequentConfig, secret: string) => {
  const forwardingRequest = await createForwardingRequest(request, nodeMiddlewares, secret);
  const middlewareApiUrl = buildMiddlewareApiUrl(config, request);

  const nodeMiddlewareResponse = await fetch(middlewareApiUrl, forwardingRequest);

  if (!nodeMiddlewareResponse.ok) {
    const { error } = await nodeMiddlewareResponse.json();
    throw new Error('Failed to call node middleware: ' + error);
  }

  const nodeMiddlewareResult = await nodeMiddlewareResponse.json();

  return nodeMiddlewareResult;
}