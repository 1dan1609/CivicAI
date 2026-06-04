import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { NextRequest, NextResponse } from "next/server";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, profile }) {
      if (profile && profile.email) {
        token.email = profile.email;
        // Map email to role and district
        if (profile.email.endsWith("@council.nyc.gov")) {
          token.role = "district_aide";
          token.district = "5";
          token.displayName = profile.name || "Jordan Rivera";
        } else {
          token.role = "citizen";
          token.district = "";
          token.displayName = profile.name || "Public Visitor";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role || "citizen";
        (session.user as any).district = token.district || "";
        (session.user as any).displayName = token.displayName || "Public Visitor";
        session.user.email = token.email || "";
      }
      return session;
    },
  },
});

// Sliding window in-memory rate limiting store for auth attempts
// Key: client IP -> List of epoch timestamps (ms)
const authRateLimitStore = new Map<string, number[]>();

function checkAuthRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const limit = 2; // maximum of 2 attempts

  const attempts = authRateLimitStore.get(clientIp) || [];
  // Filter attempts still in active window
  const activeAttempts = attempts.filter(t => now - t < windowMs);
  
  if (activeAttempts.length >= limit) {
    authRateLimitStore.set(clientIp, activeAttempts);
    return false;
  }
  
  activeAttempts.push(now);
  authRateLimitStore.set(clientIp, activeAttempts);
  return true;
}

async function wrappedAuthHandler(req: NextRequest, ctx: any) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  
  // Apply rate limiting strictly to sensitive sign-in pages, OAuth callback, or POST attempts
  const isSensitiveAuth = req.nextUrl.pathname.includes("/signin") || 
                          req.nextUrl.pathname.includes("/callback") || 
                          req.method === "POST";
                          
  if (isSensitiveAuth) {
    const isAllowed = checkAuthRateLimit(ip);
    if (!isAllowed) {
      return new NextResponse(
        JSON.stringify({ error: "Too many authentication attempts. Please try again after 1 minute." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  
  return handler(req, ctx);
}

export { wrappedAuthHandler as GET, wrappedAuthHandler as POST };

