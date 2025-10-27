import { SubsequentMiddleware } from "./middleware"
import { createProxyHandler } from "./proxy";
import { createApiHandler } from "./api";
import { SubsequentStackConfig } from "./types";
import { defaultConfig } from "./config";


export const createSubsequentStack = (middlewares: SubsequentMiddleware[], config?: Partial<SubsequentStackConfig>) => {
  const fullConfig = {
    ...defaultConfig,
    ...config,
  }

  const proxyHandler = createProxyHandler(middlewares, fullConfig);
  const apiHandler = createApiHandler(middlewares, fullConfig);

  return {
    proxy: proxyHandler,
    routes: apiHandler,
  }
}