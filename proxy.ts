import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';

const { rewrite: rewriteLLM } = rewritePath('/docs/*path', '/llms.mdx/*path');
const { rewrite: rewriteMdx } = rewritePath('/docs{/*path}.mdx', '/llms.mdx{/*path}');

const passthroughPrefixes = [
  '/api',
  '/_next',
  '/blog',
  '/showcase',
  '/sponsors',
  '/llms-full.txt',
  '/llms.txt',
  '/llms.mdx',
  '/og',
  '/static.json',
  '/export',
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/icon.png',
  '/banner.webp',
  '/assets',
];

function isPassthrough(pathname: string) {
  return passthroughPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === '/docs' || pathname.startsWith('/docs/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === '/docs' ? '/' : pathname.slice('/docs'.length);
    return NextResponse.redirect(url);
  }

  const result = rewriteMdx(request.nextUrl.pathname);
  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl));
  }

  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/docs', request.nextUrl));
  }

  if (!isPassthrough(pathname)) {
    return NextResponse.rewrite(new URL(`/docs${pathname}`, request.nextUrl));
  }

  if (isMarkdownPreferred(request)) {
    const result = rewriteLLM(request.nextUrl.pathname);

    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

  return NextResponse.next();
}
