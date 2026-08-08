import { NextResponse, type NextRequest } from "next/server";

import { requestIdFromHeaders } from "@/lib/observability";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = requestIdFromHeaders(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
