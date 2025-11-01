export type SubsequentMiddlewareReturn =
  | { type: 'next' }
  | { type: 'json'; data: any }
  | { type: 'redirect'; redirect: URL }
  | { type: 'code'; code: number; message: string }