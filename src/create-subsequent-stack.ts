import { SubsequentMiddleware } from "./middleware"
import { createProxyHandler } from "./proxy";
import { createApiHandler } from "./api";
import { SubsequentStackConfig } from "./types";
import { defaultConfig } from "./config";


export const createSubsequentStack = (middlewares: SubsequentMiddleware[], config?: Partial<SubsequentStackConfig>) => {
  const SUBSEQUENTJS_SECRET = process.env.SUBSEQUENTJS_SECRET;
  if (!SUBSEQUENTJS_SECRET) {
    throw new Error('SUBSEQUENTJS_SECRET is not set');
  }

  const fullConfig = {
    ...defaultConfig,
    ...config,
  }

  const proxyHandler = createProxyHandler(middlewares, fullConfig, SUBSEQUENTJS_SECRET);
  const apiHandler = createApiHandler(middlewares, fullConfig);

  return {
    proxy: proxyHandler,
    routes: apiHandler,
  }
}