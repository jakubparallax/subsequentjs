import { NextResponse } from "next/server";
import { SubsequentMiddlewareReturn } from "./types";

export const SubsequentMiddlewareResponse = {
  next: (): SubsequentMiddlewareReturn => ({ type: 'next' }),
  json: (data: any): SubsequentMiddlewareReturn => ({ type: 'json', data }),
  redirect: (url: URL): SubsequentMiddlewareReturn => ({ type: 'redirect', redirect: url }),
  code: (code: number, message: string): SubsequentMiddlewareReturn => ({ type: 'code', code, message }),
}

export function toNextResponse(res: SubsequentMiddlewareReturn): NextResponse {
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