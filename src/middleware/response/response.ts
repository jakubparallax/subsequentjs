export const SubsequentMiddlewareResponse = {
  next: () => ({ type: 'next' }),
  json: (data: any) => ({ type: 'json', data }),
  redirect: (url: URL) => ({ type: 'redirect', redirect: url }),
  code: (code: number, message: string) => ({ type: 'code', code, message }),
}