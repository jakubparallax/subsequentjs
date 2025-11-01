import { NextResponse } from "next/server";
import { MiddlewareResponseType } from "./types";

export const middlewareResponse = {
  next: (): MiddlewareResponseType => ({ type: 'next' }),
  json: (data: any): MiddlewareResponseType => ({ type: 'json', data }),
  redirect: (url: URL): MiddlewareResponseType => ({ type: 'redirect', redirect: url }),
  code: (code: number, message: string): MiddlewareResponseType => ({ type: 'code', code, message }),
}

export function toNextResponse(res: MiddlewareResponseType): NextResponse {
  switch (res.type) {
    case 'next':
      return NextResponse.next()
    case 'json':
      return NextResponse.json(res.data)
    case 'redirect':
      return NextResponse.redirect(res.redirect)
    case 'code':
      return NextResponse.json({ error: res.message }, { status: res.code })
    default:
      throw new Error(`Unknown response type: ${(res as any).type}`)
  }
}