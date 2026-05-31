/**
 * ⚠ ANYTHING PLATFORM — DO NOT REWRITE THIS FILE ⚠
 *
 * Auth catch-all — stubbed while auth is not enabled for this project.
 * Importing toNextJsHandler from better-auth/next-js pulls in
 * @better-auth/kysely-adapter which breaks the production build.
 * This stub is replaced automatically when auth is enabled.
 */
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  return auth.handler(request);
}

export async function POST(request: Request) {
  return auth.handler(request);
}
