import type { Middleware } from "./middleware"
import { createProxyHandler } from "./proxy";
import { createApiHandler } from "./api";
import { SubsequentConfig } from "./types";
import { defaultConfig } from "./config";

type CreateParameters = {
  nodeMiddlewares: Middleware[];
  edgeMiddlewares: Middleware[];
  config?: Partial<SubsequentConfig>;
}

export const create = ({ nodeMiddlewares, edgeMiddlewares, config }: CreateParameters) => {
  const SUBSEQUENTJS_SECRET = process.env.SUBSEQUENTJS_SECRET;
  if (!SUBSEQUENTJS_SECRET) {
    throw new Error('SUBSEQUENTJS_SECRET is not set');
  }

  const fullConfig = {
    ...defaultConfig,
    ...config,
  }

  const proxyHandler = createProxyHandler(edgeMiddlewares, nodeMiddlewares, fullConfig, SUBSEQUENTJS_SECRET);
  const apiHandler = createApiHandler(nodeMiddlewares, fullConfig);

  return {
    proxy: proxyHandler,
    routes: apiHandler,
  }
}