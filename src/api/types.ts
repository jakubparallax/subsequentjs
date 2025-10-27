import { NextRequest, NextResponse } from "next/server";

export type ApiHandlerParameters = {
  params: {
    name: string;
  };
}

export type ApiHandler = (request: NextRequest, parameters: ApiHandlerParameters) => Promise<NextResponse>;
