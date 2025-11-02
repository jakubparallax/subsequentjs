# Subsequent.js

## Middleware in Next.js isn't... ideal

Currently theres not a great way to build individual middleware functions, with complex matchers and handlers.

So the natural next (see what I did there) step is subsequentjs, a package that lets you build middleware functions across both edge and node runtimes.

## Table of Contents
- [Getting Started With Subsequentjs](#getting-started-with-subsequentjs)
- [Writing Middleware](#writing-middleware)
- [Matchers](#matchers)
- [Registering Middleware](#registering-middleware)

## Getting Started With Subsequentjs

Install the package:

```bash
npm install subsequentjs
pnpm add subsequentjs
yarn add subsequentjs
```

Create a middleware function:
```ts
// /lib/middleware/my-middleware.ts
import subsequent from 'subsequentjs'

export const myMiddleware = subsequent.createMiddleware('myMiddleware', '/private-route', async (request, response) => {
  return response.code(403, 'Thou shalt not pass')
})
```

Then create a subsequent instance in your `proxy.ts` file:
```ts
// /proxy.ts
import subsequent from 'subsequentjs'
import { myMiddleware } from './lib/middleware/my-middleware'

export const { proxy, routes } = subsequent.create({
  nodeMiddlewares: [myMiddleware],
  edgeMiddlewares: [],
  config: {
    apiBasePath: '/api/subsequent',
  },
})

export const config = {
  matcher: '/(.*)',
}
```

Finally add your middleware handler api route

> [!TIP]
> This handler can be any route you'd like, so long as you provide the base path in `subsequent.create`'s `config` object.

```ts
// /app/api/subsequent/route.ts
import { routes } from '@/proxy'

export { routes as POST }
```

And you're done!

## Writing Middleware

Middleware functions are created with the `subsequent.createMiddleware` function.

```ts
import subsequent from 'subsequentjs'

export const myMiddleware = subsequent.createMiddleware('myMiddleware', '/private-route', async (request, response) => {
  return response.next(request)
})
```

The first argument is a unique name for the middleware function, followed by a matcher and a handler function.

The handler function is passed a `request` and `response` object.

The `request` object is a NextRequest object of the incoming request, this will be the same across both edge and node runtimes.

The subsequent response object has the following methods:
- `next(request: NextRequest)` – calls the next middleware function
- `code(status: number, body: string)` – sets the response status and body
- `json(body: any)` – sets the response body to a JSON object
- `redirect(url: URL)` – redirects the request to a new URL

The `next` method is used to call the next middleware function, and takes the request object as an argument to allow for chaining.

### Matchers

Matchers are used to determine which middleware function to run for a given request.

They can be a string or string array.

```ts
import subsequent from 'subsequentjs'

export const myMiddleware = subsequent.createMiddleware('myMiddleware', '/private-route', async (request, response) => {
  return response.next(request)
})
```

These follow similar rules to Next.js's `matcher` function:
- `*` – matches a single segment (`/users/*` matches `/users/123` but not `/users/123/profile`)
- `**` – matches multiple segments (`/users/**` matches `/users/123/profile`)
- `:param` – matches a single segment as a parameter (/users/:id matches /users/123)
- `!pattern` – negates the match (`!/admin` excludes `/admin`)
- `|` – separates multiple sub-patterns in a single string (/users/*|/admin/*)

Example
```ts
pathMatchesMatcher('/users/123', '/users/*'); // true
pathMatchesMatcher('/users/123/profile', '/users/*'); // false
pathMatchesMatcher('/users/123/profile', '/users/**'); // true
pathMatchesMatcher('/admin', '!/admin'); // false
pathMatchesMatcher('/users/123', ['/users/*', '!/users/123']); // false
```

### Registering Middleware

When writing middleware, you'll mainly want to keep it in the edge runtime for speed.

But if you'd like a middlware function to access data from a database, or call other services, you'll want to run it in the node runtime.

To do this, put the function in the `nodeMiddlewares` array instead of the `edgeMiddlewares` array.

```ts
// /proxy.ts
import subsequent from 'subsequentjs'
import { myMiddleware } from './lib/middleware/my-middleware'

export const { proxy, routes } = subsequent.create({
  nodeMiddlewares: [myMiddleware], // <------ HERE
  edgeMiddlewares: [],
  config: {
    apiBasePath: '/api/subsequent',
  },
})
```

> [!IMPORTANT]  
> Middleware functions will be executed in the order they are registered above, the edge runtime will run first, followed by the node runtime.
