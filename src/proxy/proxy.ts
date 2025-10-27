import { NextRequest, NextResponse } from "next/server";
import { SubsequentMiddleware } from "../middleware";
import type { ProxyHandler } from "./types";
import type { SubsequentStackConfig } from "../types";

export const createProxyHandler = (middlewares: SubsequentMiddleware[], config: SubsequentStackConfig): ProxyHandler => {
  return async (request: NextRequest) => {
    return NextResponse.next();
  };
}