import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login") || path.startsWith("/signup");
  const isCallback = path.startsWith("/callback");
  const isApiRoute = path.startsWith("/api");
  // Public marketing surface — viewable signed-out or signed-in.
  const isMarketing =
    path === "/" ||
    path.startsWith("/terms") ||
    path.startsWith("/privacy") ||
    path.startsWith("/refunds") ||
    // Indexable landing surfaces — they have to be reachable signed-out or
    // crawlers get bounced to /login and the content is invisible to search.
    path.startsWith("/for/") ||
    path.startsWith("/blog");

  if (!user && !isAuthPage && !isCallback && !isApiRoute && !isMarketing) {
    // Send signed-out users hitting the app to login.
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    // Signed-in users don't need the auth pages — drop them into the app.
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
