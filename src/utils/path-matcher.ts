import { Middleware } from "../middleware";

export const pathMatchesMatcher = (path: string, matcher: string | string[]): boolean => {
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
      if (segment === '**') return '.*';           // multi-segment wildcard
      if (segment === '*') return '[^/]+?';       // single segment wildcard
      if (segment.startsWith(':')) return '[^/]+?'; // param
      return segment.replace(/[.+^${}()|[\]\\]/g, '\\$&'); // escape literal
    }).join('/') + '$';

    const regex = new RegExp(regexString);

    if (regex.test(path)) {
      if (isNegated) {
        return false;
      }
      matched = true;
    }
  };

  return matched;
}

export const filterMiddlewaresByPath = (middlewares: Middleware[], path: string): Middleware[] => {
  return middlewares.filter((middleware) => pathMatchesMatcher(path, middleware.matcher));
}