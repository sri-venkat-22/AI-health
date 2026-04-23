import { useCallback, useEffect, useRef, useState } from "react";

interface BrowserSpeechRecognitionEvent {
  results: ArrayLike<{
    isFinal: boolean;
    length: number;
    [index: number]: {
      transcript: string;
    };
  }>;
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

const RECOGNITION_LANG_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  kn: "kn-IN",
  ml: "ml-IN",
};

function getRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export const isSpeechSupported = () => Boolean(getRecognitionCtor());

export function useSpeechRecognition(langCode: string) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalCallbackRef = useRef<((text: string) => void) | null>(null);

  const supported = isSpeechSupported();

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const RecognitionCtor = getRecognitionCtor();
      if (!RecognitionCtor) {
        setError("Speech recognition is not supported in this browser.");
        return;
      }

      setError(null);
      setInterim("");
      finalCallbackRef.current = onFinal;

      const recognition = new RecognitionCtor();
      recognition.lang = RECOGNITION_LANG_MAP[langCode] || "en-IN";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";

        Array.from(event.results).forEach((result) => {
          const transcript = result[0]?.transcript || "";
          if (result.isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        });

        setInterim(interimText);
        if (finalText.trim()) {
          finalCallbackRef.current?.(finalText.trim());
        }
      };

      recognition.onerror = (event) => {
        setListening(false);
        setError(
          event.error === "not-allowed"
            ? "Microphone permission was denied."
            : "Speech recognition could not transcribe the audio.",
        );
      };

      recognition.onend = () => {
        setListening(false);
        setInterim("");
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    },
    [langCode],
  );

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { supported, listening, interim, error, start, stop };
}
