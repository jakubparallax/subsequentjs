import { NextRequest, NextResponse } from "next/server";
import { SubsequentStackConfig } from "../types";
import { verifySubrequestToken } from "./subrequest-token";

export const isSubsequentMiddlewareRoute = (request: NextRequest, config: SubsequentStackConfig): boolean => {
  const { pathname } = request.nextUrl;
  return pathname.startsWith(config.apiBasePath)
}

const respondError = (message: string, status: number): NextResponse => {
  return NextResponse.json({ error: message }, { status });
}

export const handleSubsequentMiddlewareRequest = async (request: NextRequest, secret: string): Promise<NextResponse> => {
  if (request.method !== 'POST') {
    return respondError('Method not allowed', 405);
  }

  const body = await request.text();

  const middlewareSubrequestToken = request.headers.get('x-subsequentjs-middleware-token');
  if (!middlewareSubrequestToken) {
    return respondError('Middleware token is required', 401);
  }

  if (!verifySubrequestToken(middlewareSubrequestToken, body, secret)) {
    return respondError('Invalid middleware token', 401);
  }

  return NextResponse.next();
}