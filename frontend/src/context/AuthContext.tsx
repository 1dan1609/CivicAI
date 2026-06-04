"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

export type UserRole = "citizen" | "district_aide";

export interface UserProfile {
  role: UserRole;
  displayName: string;
  district: string;
  email: string;
}

interface AuthContextType {
  user: UserProfile;
  isSignedIn: boolean;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
  updateProfileName: (newName: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: { role: "citizen", displayName: "Public Visitor", district: "", email: "" },
  isSignedIn: false,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
  updateProfileName: async () => {},
  deleteAccount: async () => {},
});

function AuthProviderInternal({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [customDisplayName, setCustomDisplayName] = useState<string>("");

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      fetch(`${API_BASE_URL}/api/profile?email=${encodeURIComponent(session.user.email)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => {
          if (data && data.displayName) {
            setCustomDisplayName(data.displayName);
          }
        })
        .catch((err) => console.error("Failed to fetch custom profile name:", err));
    } else {
      setCustomDisplayName("");
    }
  }, [status, session]);

  const user: UserProfile = useMemo(() => {
    if (status === "authenticated" && session?.user) {
      const su = session.user as any;
      return {
        role: su.role || "citizen",
        displayName: customDisplayName || su.displayName || session.user.name || "Public Visitor",
        district: su.district || "",
        email: session.user.email || "",
      };
    }
    return {
      role: "citizen",
      displayName: "Public Visitor",
      district: "",
      email: "",
    };
  }, [session, status, customDisplayName]);

  const isSignedIn = status === "authenticated";

  const handleSignIn = () => {
    signIn("google");
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const updateProfileName = async (newName: string) => {
    if (status !== "authenticated" || !session?.user?.email) return;
    const email = session.user.email;
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName: newName }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setCustomDisplayName(newName);
    } catch (err) {
      console.error("Failed to update profile name:", err);
      throw err;
    }
  };

  const deleteAccount = async () => {
    if (status !== "authenticated" || !session?.user?.email) return;
    const email = session.user.email;
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      handleSignOut();
    } catch (err) {
      console.error("Failed to delete account:", err);
      throw err;
    }
  };

  const isLoading = status === "loading";

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn,
        isLoading,
        signIn: handleSignIn,
        signOut: handleSignOut,
        updateProfileName,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInternal>{children}</AuthProviderInternal>
    </SessionProvider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

