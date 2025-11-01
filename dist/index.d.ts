declare const subsequent: {
    create: ({ nodeMiddlewares, edgeMiddlewares, config }: {
        nodeMiddlewares: import("./middleware").Middleware[];
        edgeMiddlewares: import("./middleware").Middleware[];
        config?: Partial<import("./types").SubsequentConfig>;
    }) => {
        proxy: import("./proxy").ProxyHandler;
        routes: import("./api").ApiHandler;
    };
    createMiddleware: (name: string, matcher: import("./middleware").MiddlewareMatcher, handler: import("./middleware").MiddlewareHandler) => import("./middleware").Middleware;
    middlewareResponse: {
        next: (_request: import("next/server").NextRequest) => Promise<import("./middleware").MiddlewareResponseType>;
        json: (data: any) => import("./middleware").MiddlewareResponseType;
        redirect: (url: URL) => import("./middleware").MiddlewareResponseType;
        code: (code: number, message: string) => import("./middleware").MiddlewareResponseType;
    };
};
export default subsequent;
//# sourceMappingURL=index.d.ts.map