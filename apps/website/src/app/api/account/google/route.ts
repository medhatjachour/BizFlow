import crypto from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCOUNT_COOKIE, loginWithGoogleProfile } from "@/lib/account-auth";
import { siteUrl, withBasePath } from "@/lib/site";

const STATE_COOKIE = "bf_google_oauth_state";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function redirectUri() {
  return `${siteUrl}${withBasePath("/api/account/google")}`;
}

function configured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function GET(request: Request) {
  if (!configured()) {
    return NextResponse.redirect(new URL(withBasePath("/account/login?error=google_not_configured"), siteUrl));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    const state = crypto.randomBytes(32).toString("hex");
    const authorizationUrl = new URL(GOOGLE_AUTH_URL);
    authorizationUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri());
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", "openid email profile");
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("prompt", "select_account");

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });
    return response;
  }

  const state = url.searchParams.get("state");
  const expectedState = (await cookies()).get(STATE_COOKIE)?.value;
  const stateMatches = Boolean(
    state && expectedState && state.length === expectedState.length && crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
  );
  if (!stateMatches) {
    return NextResponse.redirect(new URL(withBasePath("/account/login?error=google_state_invalid"), siteUrl));
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
    });
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) throw new Error("Google token exchange failed");

    const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = (await profileResponse.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified !== true) {
      throw new Error("Google did not return a verified email");
    }

    const { token: sessionToken } = await loginWithGoogleProfile({
      subject: profile.sub,
      email: profile.email,
      fullName: profile.name,
    });
    const response = NextResponse.redirect(new URL(withBasePath("/account"), siteUrl));
    response.cookies.set(ACCOUNT_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL(withBasePath("/account/login?error=google_failed"), siteUrl));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }
}