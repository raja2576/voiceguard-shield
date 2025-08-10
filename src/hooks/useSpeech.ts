import { useEffect, useRef, useState } from "react";

export type SpeechStatus = "idle" | "listening" | "error";

export function useSpeech(lang: "en-US" | "es-ES" | "fr-FR" = "en-US") {
  const recognitionRef = useRef<any | null>(null);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [interim, setInterim] = useState<string>("");
  const [finalText, setFinalText] = useState<string>("");

  useEffect(() => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let interimStr = "";
      let finalStr = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalStr += result[0].transcript + " ";
        } else {
          interimStr += result[0].transcript + " ";
        }
      }
      if (interimStr) setInterim(interimStr.trim());
      if (finalStr) setFinalText((prev) => (prev + " " + finalStr).trim());
    };

    rec.onerror = () => setStatus("error");
    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {}
    };
  }, [lang]);

  const start = async () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("error");
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current?.start();
      setStatus("listening");
    } catch (e) {
      setStatus("error");
    }
  };

  const stop = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setStatus("idle");
    setInterim("");
  };

  return { status, interim, finalText, start, stop, setFinalText };
}
