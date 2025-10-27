import type { ApiHandler, ApiHandlerParameters } from "./types";
import { SubsequentMiddleware } from "../middleware";
import { NextRequest, NextResponse } from "next/server";
import { SubsequentStackConfig } from "../types";

export const createApiHandler = (middlewares: SubsequentMiddleware[], config: SubsequentStackConfig): ApiHandler => {
  return async (request: NextRequest, parameters: ApiHandlerParameters) => {
    return NextResponse.next();
  };
}