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
        token.role = "citizen";
        token.district = "";
        token.displayName = profile.name || "Public Visitor";
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
  return handler(req, ctx);
}

export { wrappedAuthHandler as GET, wrappedAuthHandler as POST };

