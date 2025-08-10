import { useEffect, useMemo, useRef, useState } from "react";

export type RiskLabel = "Safe" | "Suspicious" | "Scam";

export type RiskState = {
  score: number; // 0..100
  label: RiskLabel;
  rationale: string;
};

const KEYWORDS = {
  "en-US": [
    { k: /one[-\s]?time\s?code|otp|verification\s?code/i, r: "requests OTP" },
    { k: /gift\s?card|wire\s?transfer|bitcoin|crypto\s?payment/i, r: "payment request" },
    { k: /urgent|immediately|act\s?now|limited\s?time/i, r: "pressure cue" },
    { k: /bank\s?account|routing\s?number|ssn|social\s?security/i, r: "asks sensitive info" },
  ],
  "es-ES": [
    { k: /código\s?de\s?verificación|clave\s?única|otp/i, r: "solicita código" },
    { k: /tarjeta\s?de\s?regalo|transferencia|bitcoin|cripto/i, r: "pago sospechoso" },
    { k: /urgente|inmediatamente|actúe\s?ahora/i, r: "presión" },
    { k: /cuenta\s?bancaria|número\s?de\s?ruta|dni/i, r: "datos sensibles" },
  ],
  "fr-FR": [
    { k: /code\s?unique|code\s?de\s?vérification|otp/i, r: "demande de code" },
    { k: /carte\s?cadeau|virement|bitcoin|crypto/i, r: "paiement suspect" },
    { k: /urgent|immédiatement|agissez\s?maintenant/i, r: "pression" },
    { k: /compte\s?bancaire|rib|numéro\s?de\s?sécurité\s?sociale/i, r: "infos sensibles" },
  ],
};

export function useRiskEngine(lang: "en-US" | "es-ES" | "fr-FR") {
  const [state, setState] = useState<RiskState>({ score: 0, label: "Safe", rationale: "" });
  const textWindowRef = useRef<string>("");
  const lastRationaleRef = useRef<string>("");

  const keywords = useMemo(() => KEYWORDS[lang] ?? KEYWORDS["en-US"], [lang]);

  const computeScamScore = (text: string) => {
    let score = 0;
    let rationale = lastRationaleRef.current;
    for (const { k, r } of keywords) {
      if (k.test(text)) {
        score += 35;
        rationale = r;
      }
    }
    // Numeric code pattern (e.g., 6-digit code)
    if (/\b\d{6}\b/.test(text)) {
      score += 25;
      rationale = rationale || "numeric code";
    }
    // Money amount + action
    if (/(\$|€)\s?\d{2,}|\d+\s?(dollars|euros)/i.test(text)) {
      score += 20;
      rationale = rationale || "money mention";
    }
    return { score: Math.min(100, score), rationale };
  };

  const pushUpdate = (opts: { text?: string; spoofScore?: number }) => {
    const { text, spoofScore } = opts;
    if (text) {
      textWindowRef.current = (textWindowRef.current + " " + text).trim().slice(-600);
    }
    const scam = computeScamScore(textWindowRef.current);
    const spoof = Math.round(Math.min(100, Math.max(0, (spoofScore ?? 0) * 100)));

    // Fusion
    const fused = Math.round(0.6 * scam.score + 0.4 * spoof);

    let label: RiskLabel = "Safe";
    if (fused >= 70) label = "Scam";
    else if (fused >= 40) label = "Suspicious";

    const rationale = scam.rationale || (spoof >= 60 ? "voice spoof-like" : "");
    lastRationaleRef.current = rationale;

    setState({ score: fused, label, rationale });
  };

  const reset = () => {
    textWindowRef.current = "";
    lastRationaleRef.current = "";
    setState({ score: 0, label: "Safe", rationale: "" });
  };

  return { state, pushUpdate, reset };
}
