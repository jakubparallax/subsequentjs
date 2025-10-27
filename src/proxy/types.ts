import { NextRequest, NextResponse } from "next/server";

export type ProxyHandler = (request: NextRequest) => Promise<NextResponse>;