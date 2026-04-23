import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { hasSupabaseConfig, supabase } from "@/integrations/supabase/client";
import {
  getCurrentLocalClinician,
  seedDemoClinician,
  signInLocalClinician,
  signOutLocalClinician,
  signUpLocalClinician,
} from "@/lib/localStore";
import type { AppUser } from "@/lib/types";
import type { Session } from "@supabase/supabase-js";

interface AuthCtx {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  authMode: "local" | "supabase";
  signIn: (input: { email: string; password: string }) => Promise<AppUser | null>;
  signUp: (input: {
    email: string;
    password: string;
    full_name: string;
    specialty?: string;
    organization?: string;
  }) => Promise<AppUser | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  authMode: "local",
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const authMode = hasSupabaseConfig ? "supabase" : "local";

  useEffect(() => {
    if (hasSupabaseConfig) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setUser(
          nextSession?.user
            ? {
                id: nextSession.user.id,
                email: nextSession.user.email || "",
                full_name: (nextSession.user.user_metadata?.full_name as string | undefined) || "",
                specialty: (nextSession.user.user_metadata?.specialty as string | undefined) || "",
                organization: (nextSession.user.user_metadata?.organization as string | undefined) || "",
                mode: "supabase",
              }
            : null,
        );
        setLoading(false);
      });

      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setUser(
          data.session?.user
            ? {
                id: data.session.user.id,
                email: data.session.user.email || "",
                full_name: (data.session.user.user_metadata?.full_name as string | undefined) || "",
                specialty: (data.session.user.user_metadata?.specialty as string | undefined) || "",
                organization: (data.session.user.user_metadata?.organization as string | undefined) || "",
                mode: "supabase",
              }
            : null,
        );
        setLoading(false);
      });

      return () => sub.subscription.unsubscribe();
    }

    seedDemoClinician();
    setUser(getCurrentLocalClinician());
    setSession(null);
    setLoading(false);

    const onStorage = () => {
      setUser(getCurrentLocalClinician());
      setLoading(false);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    if (hasSupabaseConfig) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const nextUser = data.user
        ? {
            id: data.user.id,
            email: data.user.email || email,
            full_name: (data.user.user_metadata?.full_name as string | undefined) || "",
            specialty: (data.user.user_metadata?.specialty as string | undefined) || "",
            organization: (data.user.user_metadata?.organization as string | undefined) || "",
            mode: "supabase" as const,
          }
        : null;
      setUser(nextUser);
      return nextUser;
    }

    const localUser = signInLocalClinician(email, password);
    setUser(localUser);
    return localUser;
  };

  const signUp = async (input: {
    email: string;
    password: string;
    full_name: string;
    specialty?: string;
    organization?: string;
  }) => {
    if (hasSupabaseConfig) {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: `${window.location.origin}/clinician/dashboard`,
          data: {
            full_name: input.full_name,
            specialty: input.specialty || "",
            organization: input.organization || "",
          },
        },
      });
      if (error) throw error;

      return data.user
        ? {
            id: data.user.id,
            email: data.user.email || input.email,
            full_name: input.full_name,
            specialty: input.specialty || "",
            organization: input.organization || "",
            mode: "supabase" as const,
          }
        : null;
    }

    const localUser = signUpLocalClinician(input);
    setUser(localUser);
    return localUser;
  };

  const signOut = async () => {
    if (hasSupabaseConfig) {
      await supabase.auth.signOut();
      return;
    }

    signOutLocalClinician();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, session, loading, authMode, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
