import { NextRequest, NextResponse } from "next/server";

export type ApiHandler = (request: NextRequest) => Promise<NextResponse>;
