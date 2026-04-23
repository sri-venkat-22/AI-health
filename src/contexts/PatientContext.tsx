import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  getCurrentPatient,
  listPatientHistory,
  seedDemoPatient,
  signInPatient,
  signOutPatient,
  signUpPatient,
} from "@/lib/offlinePatientDb";
import type { PatientAccount, PatientHistoryRecord } from "@/lib/types";

interface PatientContextValue {
  patient: PatientAccount | null;
  loading: boolean;
  history: PatientHistoryRecord[];
  refreshHistory: () => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<PatientAccount | null>;
  signUp: (input: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    preferred_language?: string;
  }) => Promise<PatientAccount | null>;
  signOut: () => Promise<void>;
}

const PatientContext = createContext<PatientContextValue>({
  patient: null,
  loading: true,
  history: [],
  refreshHistory: async () => {},
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => {},
});

export const PatientProvider = ({ children }: { children: ReactNode }) => {
  const [patient, setPatient] = useState<PatientAccount | null>(null);
  const [history, setHistory] = useState<PatientHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshHistory = async () => {
    if (!patient) {
      setHistory([]);
      return;
    }
    const nextHistory = await listPatientHistory(patient.id);
    setHistory(nextHistory);
  };

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        await seedDemoPatient();
      } catch {
        // ignore seed failures in unsupported environments
      }

      const currentPatient = await getCurrentPatient().catch(() => null);
      if (cancelled) return;

      setPatient(currentPatient);
      if (currentPatient) {
        const nextHistory = await listPatientHistory(currentPatient.id).catch(() => []);
        if (!cancelled) setHistory(nextHistory);
      }
      setLoading(false);
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    const nextPatient = await signInPatient(email, password);
    setPatient(nextPatient);
    setHistory(await listPatientHistory(nextPatient.id));
    return nextPatient;
  };

  const signUp = async (input: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    preferred_language?: string;
  }) => {
    const nextPatient = await signUpPatient(input);
    setPatient(nextPatient);
    setHistory(await listPatientHistory(nextPatient.id));
    return nextPatient;
  };

  const signOut = async () => {
    signOutPatient();
    setPatient(null);
    setHistory([]);
  };

  return (
    <PatientContext.Provider
      value={{
        patient,
        loading,
        history,
        refreshHistory,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
};

export const usePatient = () => useContext(PatientContext);
