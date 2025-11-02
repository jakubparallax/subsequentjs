import { NextResponse } from 'next/server';
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

const createProxyHandler = (edgeMiddlewares, nodeMiddlewares, config, secret) => {
    return async (request) => {
        if (isMiddlewareRoute(request, config)) {
            return await handleMiddlewareRequest(request, secret);
        }
        const matchingEdgeMiddlewares = edgeMiddlewares.filter((middleware) => middleware.matcher === request.nextUrl.pathname);
        const edgeMiddlewareHandler = stackMiddlewares(matchingEdgeMiddlewares);
        const edgeResponse = await edgeMiddlewareHandler(request);
        if (edgeResponse.type !== 'next') {
            return toNextResponse(edgeResponse);
        }
        const matchingNodeMiddlewares = nodeMiddlewares.filter((middleware) => middleware.matcher === request.nextUrl.pathname);
        if (matchingNodeMiddlewares.length === 0) {
            return NextResponse.next();
        }
        const middlewareHeader = matchingNodeMiddlewares.map((middleware) => middleware.name).join(',');
        const body = await request.text();
        const middlewareToken = generateSubrequestToken(body, secret);
        const nodeMiddlewareResponse = await fetch(new URL(config.apiBasePath, request.url), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...request.headers,
                'x-subsequentjs-middleware-token': middlewareToken,
                'x-subsequentjs-middleware': middlewareHeader,
            },
            body,
        });
        if (!nodeMiddlewareResponse.ok) {
            const { error } = await nodeMiddlewareResponse.json();
            throw new Error('Failed to call node middleware: ' + error);
        }
        const nodeMiddlewareResult = await nodeMiddlewareResponse.json();
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
        const middlewareStack = stackMiddlewares(requestedMiddlewares);
        try {
            const response = await middlewareStack(request);
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
