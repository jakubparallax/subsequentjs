import { NextRequest } from "next/server";
import { Middleware } from "../middleware";
import { generateSubrequestToken } from "./subrequest-token";
import { SubsequentConfig } from "../types";

const METHODS_WITH_BODY = ['POST', 'PUT', 'PATCH', 'DELETE'];

const requestShouldHaveBody = (method: string) => METHODS_WITH_BODY.includes(method);

/**
 * Create a new request object to be sent to the middleware API route, with additional headers for piecing together the original request after forwarding
 * @param request - The incoming request
 * @param matchingNodeMiddlewares - The middleware(s) to execute in the API route
 * @param secret - The secret used to sign the request
 * @returns A new request object to be sent to the middleware API route
 */
export const createForwardingRequest = async (request: NextRequest, matchingNodeMiddlewares: Middleware[], secret: string) => {
  // Join middleware names, for the middleware API route to identify which middleware(s) to run
  const middlewareHeader = matchingNodeMiddlewares.map((middleware) => middleware.name).join(',');
  
  // Grab body to sign
  const body = await request.text();

  // Generate token, for authenticating with middleware API routes
  const middlewareToken = generateSubrequestToken(body, secret);

  // Copy headers
  const headers = new Headers(request.headers);

  // Set Subsequent headers, used for piecing together the original request after forwarding
  headers.set('x-subsequentjs-middleware-token', middlewareToken);
  headers.set('x-subsequentjs-middleware', middlewareHeader);
  headers.set('x-subsequentjs-forwarded-url', request.url);
  headers.set('x-subsequentjs-forwarded-method', request.method);

  // If the method does not have a body, set the body to null
  const finalRequestBody = requestShouldHaveBody(request.method) ? body : null;

  return {
    method: 'POST',
    headers,
    body: finalRequestBody,
  }
}

/**
 * Create a new NextRequest from the forwarded request headers
 * @param request - The forwarded request
 * @returns A new NextRequest with the original URL, method, headers, and body
 */
export const createOriginalRequestFromForwarded = (request: NextRequest) => {
  const originalUrl = request.headers.get('x-subsequentjs-forwarded-url');
  const originalMethod = request.headers.get('x-subsequentjs-forwarded-method');

  if (!originalUrl || !originalMethod) {
    throw new Error('Original URL or method not found');
  }
  
  const originalHeaders = new Headers(request.headers);
  originalHeaders.delete('x-subsequentjs-middleware-token');
  originalHeaders.delete('x-subsequentjs-middleware');
  originalHeaders.delete('x-subsequentjs-forwarded-url');
  originalHeaders.delete('x-subsequentjs-forwarded-method');

  const originalBody = requestShouldHaveBody(originalMethod) ? request.body : null;

  const requestOptions = {
    method: originalMethod,
    headers: originalHeaders,
    body: originalBody,
  }

  return new NextRequest(originalUrl, requestOptions);
}

export const buildMiddlewareApiUrl = (config: SubsequentConfig, request: NextRequest) => {
  return new URL(config.apiBasePath, request.url);
}