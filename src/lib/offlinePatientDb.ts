import { createId } from "@/lib/localStore";
import type { IntakeData, IntegrativePlan, PatientAccount, PatientHistoryRecord } from "@/lib/types";

const DB_NAME = "sanjeevani-offline-db";
const DB_VERSION = 1;
const CURRENT_PATIENT_KEY = "sanjeevani:current-patient";
const PATIENT_STORE = "patients";
const HISTORY_STORE = "patient_history";

type StoredPatientAccount = PatientAccount & {
  password_hash: string;
};

function ensureBrowser() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    throw new Error("IndexedDB is not available in this environment.");
  }
}

function openDb(): Promise<IDBDatabase> {
  ensureBrowser();

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error || new Error("Failed to open offline patient database."));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PATIENT_STORE)) {
        const store = db.createObjectStore(PATIENT_STORE, { keyPath: "id" });
        store.createIndex("email", "email", { unique: true });
      }

      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const store = db.createObjectStore(HISTORY_STORE, { keyPath: "id" });
        store.createIndex("patient_id", "patient_id", { unique: false });
        store.createIndex("plan_id", "plan_id", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

async function hashPassword(password: string) {
  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCurrentPatientId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CURRENT_PATIENT_KEY);
}

function setCurrentPatientId(patientId: string | null) {
  if (typeof window === "undefined") return;
  if (!patientId) {
    window.localStorage.removeItem(CURRENT_PATIENT_KEY);
    return;
  }
  window.localStorage.setItem(CURRENT_PATIENT_KEY, patientId);
}

async function readPatientById(patientId: string) {
  const db = await openDb();
  try {
    const transaction = db.transaction(PATIENT_STORE, "readonly");
    const store = transaction.objectStore(PATIENT_STORE);
    const patient = await requestToPromise(store.get(patientId));
    return (patient as StoredPatientAccount | undefined) || null;
  } finally {
    db.close();
  }
}

async function readPatientByEmail(email: string) {
  const db = await openDb();
  try {
    const transaction = db.transaction(PATIENT_STORE, "readonly");
    const store = transaction.objectStore(PATIENT_STORE);
    const index = store.index("email");
    const patient = await requestToPromise(index.get(normalizeEmail(email)));
    return (patient as StoredPatientAccount | undefined) || null;
  } finally {
    db.close();
  }
}

function toPublicPatient(patient: StoredPatientAccount): PatientAccount {
  const { password_hash: _passwordHash, ...publicPatient } = patient;
  return publicPatient;
}

export async function getCurrentPatient() {
  const patientId = getCurrentPatientId();
  if (!patientId) return null;
  const patient = await readPatientById(patientId);
  return patient ? toPublicPatient(patient) : null;
}

export async function signUpPatient(input: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  preferred_language?: string;
}) {
  const existing = await readPatientByEmail(input.email);
  if (existing) {
    throw new Error("A patient account already exists for this email.");
  }

  const patient: StoredPatientAccount = {
    id: createId("patient"),
    full_name: input.full_name.trim(),
    email: normalizeEmail(input.email),
    phone: input.phone?.trim() || "",
    preferred_language: input.preferred_language || "en",
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
    password_hash: await hashPassword(input.password),
  };

  const db = await openDb();
  try {
    const transaction = db.transaction(PATIENT_STORE, "readwrite");
    const store = transaction.objectStore(PATIENT_STORE);
    await requestToPromise(store.put(patient));
  } finally {
    db.close();
  }

  setCurrentPatientId(patient.id);
  return toPublicPatient(patient);
}

export async function signInPatient(email: string, password: string) {
  const patient = await readPatientByEmail(email);
  if (!patient) {
    throw new Error("No local patient account exists for this email.");
  }

  const passwordHash = await hashPassword(password);
  if (patient.password_hash !== passwordHash) {
    throw new Error("Incorrect patient password.");
  }

  const updatedPatient: StoredPatientAccount = {
    ...patient,
    last_login_at: new Date().toISOString(),
  };

  const db = await openDb();
  try {
    const transaction = db.transaction(PATIENT_STORE, "readwrite");
    const store = transaction.objectStore(PATIENT_STORE);
    await requestToPromise(store.put(updatedPatient));
  } finally {
    db.close();
  }

  setCurrentPatientId(updatedPatient.id);
  return toPublicPatient(updatedPatient);
}

export function signOutPatient() {
  setCurrentPatientId(null);
}

export async function savePatientHistoryRecord(input: {
  patient: PatientAccount;
  planId: string;
  intake: IntakeData;
  plan: IntegrativePlan;
}) {
  const record: PatientHistoryRecord = {
    id: createId("patient_history"),
    patient_id: input.patient.id,
    plan_id: input.planId,
    created_at: new Date().toISOString(),
    intake: input.intake,
    plan: input.plan,
    risk_level: input.plan.risk_level,
    language_code: input.intake.language_code || "en",
    summary: input.plan.translation.summary,
  };

  const db = await openDb();
  try {
    const transaction = db.transaction(HISTORY_STORE, "readwrite");
    const store = transaction.objectStore(HISTORY_STORE);
    await requestToPromise(store.put(record));
  } finally {
    db.close();
  }

  return record;
}

export async function listPatientHistory(patientId: string) {
  const db = await openDb();
  try {
    const transaction = db.transaction(HISTORY_STORE, "readonly");
    const store = transaction.objectStore(HISTORY_STORE);
    const index = store.index("patient_id");
    const records = await requestToPromise(index.getAll(patientId));
    return ((records as PatientHistoryRecord[]) || []).sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
  } finally {
    db.close();
  }
}

export async function getLatestPatientHistory(patientId: string) {
  const history = await listPatientHistory(patientId);
  return history[0] || null;
}

export async function seedDemoPatient() {
  const existing = await readPatientByEmail("patient@sanjeevani.demo");
  if (existing) return toPublicPatient(existing);

  return signUpPatient({
    full_name: "Demo Patient",
    email: "patient@sanjeevani.demo",
    password: "demo123",
    phone: "9999999999",
    preferred_language: "en",
  });
}
