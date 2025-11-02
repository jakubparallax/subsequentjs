import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const createMiddleware = (name, matcher, handler) => {
    return {
        name,
        handler,
        matcher,
    };
};

const middlewareResponse = {
    next: (_request) => Promise.resolve({ type: 'next' }),
    json: (data) => ({ type: 'json', data }),
    redirect: (url) => ({ type: 'redirect', redirect: url }),
    code: (code, message) => ({ type: 'code', code, message: message ?? '' }),
};
function toNextResponse(res) {
    switch (res.type) {
        case 'next':
            return NextResponse.next();
        case 'json':
            return NextResponse.json(res.data);
        case 'redirect':
            return NextResponse.redirect(res.redirect);
        case 'code':
            return NextResponse.json({ error: res.message }, { status: res.code });
        default:
            throw new Error(`Unknown response type: ${res.type}`);
    }
}

/**
 * Stack middleware array into a single recursive middleware handler
 * Injects a next function into the middleware handler, to allow for chaining
 * @param middlewares - The array of middleware to stack
 * @param index - INTERNAL recursion index
 * @returns A single middleware handler that can be called with a NextRequest, and will call middleware until a response or next is returned
 */
const stackMiddlewares = (middlewares, index = 0) => {
    const current = middlewares[index];
    if (current) {
        const next = stackMiddlewares(middlewares, index + 1);
        return (request) => {
            const response = { ...middlewareResponse, next: (request) => next(request) };
            return current.handler(request, response);
        };
    }
    return async () => ({ type: 'next' });
};

const generateSubrequestToken = (body, secret) => {
    const token = jwt.sign({ request: JSON.stringify(body) }, secret, { expiresIn: '5min' });
    return token;
};
const verifySubrequestToken = (token, body, secret) => {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'string') {
        return false;
    }
    return decoded.request === JSON.stringify(body);
};

const METHODS_WITH_BODY = ['POST', 'PUT', 'PATCH', 'DELETE'];
const requestShouldHaveBody = (method) => METHODS_WITH_BODY.includes(method);
/**
 * Create a new request object to be sent to the middleware API route, with additional headers for piecing together the original request after forwarding
 * @param request - The incoming request
 * @param matchingNodeMiddlewares - The middleware(s) to execute in the API route
 * @param secret - The secret used to sign the request
 * @returns A new request object to be sent to the middleware API route
 */
const createForwardingRequest = async (request, matchingNodeMiddlewares, secret) => {
    // Join middleware names, for the middleware API route to identify which middleware(s) to run
    const middlewareHeader = matchingNodeMiddlewares.map((middleware) => middleware.name).join(',');
    // Grab body to sign
    const body = await request.text();
    // Generate token, for authenticating with middleware API routes
    const middlewareToken = generateSubrequestToken(body, secret);
    // Copy headers
    const headers = new Headers(request.headers);
    // Set Subsequent headers, used for piecing together the original request after forwarding
    headers.set('x-subsequentjs-middleware-token', middlewareToken);
    headers.set('x-subsequentjs-middleware', middlewareHeader);
    headers.set('x-subsequentjs-forwarded-url', request.url);
    headers.set('x-subsequentjs-forwarded-method', request.method);
    // If the method does not have a body, set the body to null
    const finalRequestBody = requestShouldHaveBody(request.method) ? body : null;
    return {
        method: 'POST',
        headers,
        body: finalRequestBody,
    };
};
/**
 * Create a new NextRequest from the forwarded request headers
 * @param request - The forwarded request
 * @returns A new NextRequest with the original URL, method, headers, and body
 */
const createOriginalRequestFromForwarded = (request) => {
    const originalUrl = request.headers.get('x-subsequentjs-forwarded-url');
    const originalMethod = request.headers.get('x-subsequentjs-forwarded-method');
    if (!originalUrl || !originalMethod) {
        throw new Error('Original URL or method not found');
    }
    const originalHeaders = new Headers(request.headers);
    originalHeaders.delete('x-subsequentjs-middleware-token');
    originalHeaders.delete('x-subsequentjs-middleware');
    originalHeaders.delete('x-subsequentjs-forwarded-url');
    originalHeaders.delete('x-subsequentjs-forwarded-method');
    const originalBody = requestShouldHaveBody(originalMethod) ? request.body : null;
    const requestOptions = {
        method: originalMethod,
        headers: originalHeaders,
        body: originalBody,
    };
    return new NextRequest(originalUrl, requestOptions);
};
const buildMiddlewareApiUrl = (config, request) => {
    return new URL(config.apiBasePath, request.url);
};

const pathMatchesMatcher = (path, matcher) => {
    if (Array.isArray(matcher)) {
        return matcher.some((m) => pathMatchesMatcher(path, m));
    }
    const patterns = matcher.split('|').map((pattern) => pattern.trim()).filter(Boolean);
    let matched = false;
    for (const pattern of patterns) {
        const isNegated = pattern.startsWith('!');
        // Remove negation prefix if present
        const cleanPattern = isNegated ? pattern.slice(1) : pattern;
        // Convert pattern to regex
        const regexString = '^' + cleanPattern
            .split('/').map(segment => {
            if (segment === '**')
                return '.*'; // multi-segment wildcard
            if (segment === '*')
                return '[^/]+?'; // single segment wildcard
            if (segment.startsWith(':'))
                return '[^/]+?'; // param
            return segment.replace(/[.+^${}()|[\]\\]/g, '\\$&'); // escape literal
        }).join('/') + '$';
        const regex = new RegExp(regexString);
        if (regex.test(path)) {
            if (isNegated) {
                return false;
            }
            matched = true;
        }
    }
    return matched;
};
const filterMiddlewaresByPath = (middlewares, path) => {
    return middlewares.filter((middleware) => pathMatchesMatcher(path, middleware.matcher));
};

const isMiddlewareRoute = (request, config) => {
    const { pathname } = request.nextUrl;
    return pathname.startsWith(config.apiBasePath);
};
const respondError = (message, status) => {
    return NextResponse.json({ error: message }, { status });
};
const handleMiddlewareRequest = async (request, secret) => {
    if (request.method !== 'POST') {
        return respondError('Method not allowed', 405);
    }
    const body = await request.text();
    const middlewareSubrequestToken = request.headers.get('x-subsequentjs-middleware-token');
    if (!middlewareSubrequestToken) {
        return respondError('Middleware token is required', 401);
    }
    if (!verifySubrequestToken(middlewareSubrequestToken, body, secret)) {
        return respondError('Invalid middleware token', 401);
    }
    return NextResponse.next();
};

const runEdgeMiddleware = async (request, edgeMiddlewares) => {
    const edgeMiddlewareHandler = stackMiddlewares(edgeMiddlewares);
    const edgeResponse = await edgeMiddlewareHandler(request);
    return edgeResponse;
};
const runNodeMiddleware = async (request, nodeMiddlewares, config, secret) => {
    const forwardingRequest = await createForwardingRequest(request, nodeMiddlewares, secret);
    const middlewareApiUrl = buildMiddlewareApiUrl(config, request);
    const nodeMiddlewareResponse = await fetch(middlewareApiUrl, forwardingRequest);
    if (!nodeMiddlewareResponse.ok) {
        const { error } = await nodeMiddlewareResponse.json();
        throw new Error('Failed to call node middleware: ' + error);
    }
    const nodeMiddlewareResult = await nodeMiddlewareResponse.json();
    return nodeMiddlewareResult;
};

const createProxyHandler = (edgeMiddlewares, nodeMiddlewares, config, secret) => {
    return async (request) => {
        if (isMiddlewareRoute(request, config)) {
            return await handleMiddlewareRequest(request, secret);
        }
        const matchingEdgeMiddlewares = filterMiddlewaresByPath(edgeMiddlewares, request.nextUrl.pathname);
        const edgeResponse = await runEdgeMiddleware(request, matchingEdgeMiddlewares);
        // Skip node middleware if we're responding
        if (edgeResponse.type !== 'next')
            return toNextResponse(edgeResponse);
        const matchingNodeMiddlewares = filterMiddlewaresByPath(nodeMiddlewares, request.nextUrl.pathname);
        if (matchingNodeMiddlewares.length === 0)
            return NextResponse.next();
        const nodeMiddlewareResult = await runNodeMiddleware(request, matchingNodeMiddlewares, config, secret);
        // Respond with the node middleware result
        return toNextResponse(nodeMiddlewareResult);
    };
};

const createApiHandler = (middlewares, _config) => {
    return async (request) => {
        const requestedMiddlewareHeader = request.headers.get('x-subsequentjs-middleware');
        if (!requestedMiddlewareHeader) {
            return NextResponse.json({ error: 'Middleware not found' }, { status: 404 });
        }
        const requestedMiddlewareNames = requestedMiddlewareHeader.split(',');
        const requestedMiddlewares = middlewares.filter((middleware) => requestedMiddlewareNames.includes(middleware.name));
        if (requestedMiddlewares.length === 0) {
            return NextResponse.json({ error: 'No middleware found' }, { status: 404 });
        }
        const nodeMiddlewareHandler = stackMiddlewares(requestedMiddlewares);
        try {
            // Use the forwarded request headers to reconstruct the original request
            const originalRequest = createOriginalRequestFromForwarded(request);
            const response = await nodeMiddlewareHandler(originalRequest);
            // Respond with the subsequent response object, to be converted to a NextResponse by the proxy
            return NextResponse.json(response);
        }
        catch (error) {
            console.error(error);
            return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
        }
    };
};

const defaultConfig = {
    apiBasePath: '/api/subsequent',
};

const create = ({ nodeMiddlewares, edgeMiddlewares, config }) => {
    const SUBSEQUENTJS_SECRET = process.env.SUBSEQUENTJS_SECRET;
    if (!SUBSEQUENTJS_SECRET) {
        throw new Error('SUBSEQUENTJS_SECRET is not set');
    }
    const middlewareNames = [...nodeMiddlewares.map((middleware) => middleware.name), ...edgeMiddlewares.map((middleware) => middleware.name)];
    if (middlewareNames.length !== new Set(middlewareNames).size) {
        throw new Error('Middleware names must be unique');
    }
    const fullConfig = {
        ...defaultConfig,
        ...config,
    };
    const proxyHandler = createProxyHandler(edgeMiddlewares, nodeMiddlewares, fullConfig, SUBSEQUENTJS_SECRET);
    const apiHandler = createApiHandler(nodeMiddlewares);
    return {
        proxy: proxyHandler,
        routes: apiHandler,
    };
};

const subsequent = {
    create,
    createMiddleware,
    middlewareResponse,
};

export { subsequent as default };
//# sourceMappingURL=index.js.map
