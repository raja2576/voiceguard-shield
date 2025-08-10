import { useEffect, useMemo, useRef, useState } from "react";

export type RiskLabel = "Safe" | "Suspicious" | "Scam";

export type RiskState = {
  score: number; // 0..100
  label: RiskLabel;
  rationale: string;
};

const KEYWORDS = {
  "en-US": [
    { k: /one[-\s]?time\s?(password|code)|otp|verification\s?(code|sms|text)|security\s?code|passcode/i, r: "requests OTP" },
    { k: /pin\s?code|cvv|password|login\s?code/i, r: "requests credentials" },
    { k: /gift\s?card|wire\s?transfer|bank\s?transfer|bitcoin|crypto(\s?payment)?|western\s?union/i, r: "payment request" },
    { k: /urgent|immediately|act\s?now|limited\s?time|do\s?not\s?tell\s?anyone/i, r: "pressure cue" },
    { k: /bank\s?account|routing\s?number|account\s?number|ssn|social\s?security|driver'?s?\s?license/i, r: "asks sensitive info" },
  ],
  "es-ES": [
    { k: /código\s?(único|de\s?verificación)|otp|contraseña\s?de\s?un\s?solo\s?uso|sms\s?de\s?verificación/i, r: "solicita código" },
    { k: /pin|cvv|contraseña|clave\s?de\s?acceso/i, r: "solicita credenciales" },
    { k: /tarjeta\s?de\s?regalo|transferencia|bitcoin|cripto(\s?pago)?/i, r: "pago sospechoso" },
    { k: /urgente|inmediatamente|actúe\s?ahora|no\s?se\s?lo\s?diga\s?a\s?nadie/i, r: "presión" },
    { k: /cuenta\s?bancaria|número\s?de\s?ruta|dni|seguridad\s?social/i, r: "datos sensibles" },
  ],
  "fr-FR": [
    { k: /code\s?(unique|de\s?vérification)|otp|mot\s?de\s?passe\s?unique|sms\s?de\s?vérification/i, r: "demande de code" },
    { k: /code\s?pin|cvv|mot\s?de\s?passe|code\s?d'accès/i, r: "demande d'identifiants" },
    { k: /carte\s?cadeau|virement|bitcoin|crypto(\s?paiement)?/i, r: "paiement suspect" },
    { k: /urgent|immédiatement|agissez\s?maintenant|n'en\s?parlez\s?à\s?personne/i, r: "pression" },
    { k: /compte\s?bancaire|rib|numéro\s?de\s?sécurité\s?sociale|permis\s?de\s?conduire/i, r: "infos sensibles" },
  ],
};

const HIGH_SEVERITY = {
  "en-US": [
    { k: /(read|tell|share)\s?(me\s?)?(your\s?)?(otp|one[-\s]?time\s?(code|password)|verification\s?code)/i, r: "explicit OTP request" },
    { k: /(buy|purchase)\s?(a\s?)?gift\s?card/i, r: "gift card purchase" },
    { k: /(wire|bank)\s?transfer\s?now/i, r: "urgent transfer" },
  ],
  "es-ES": [
    { k: /(dime|compárteme)\s?(tu\s?)?(código|otp)/i, r: "solicitud explícita de código" },
    { k: /(compre|compre\s?una)\s?tarjeta\s?de\s?regalo/i, r: "compra de tarjeta regalo" },
    { k: /transferencia\s?bancaria\s?ahora/i, r: "transferencia urgente" },
  ],
  "fr-FR": [
    { k: /(dis|partage)\s?(moi\s?)?(ton\s?)?(code|otp)/i, r: "demande explicite de code" },
    { k: /(achète|acheter)\s?une\s?carte\s?cadeau/i, r: "achat carte cadeau" },
    { k: /virement\s?immédiat/i, r: "virement urgent" },
  ],
};

export function useRiskEngine(lang: "en-US" | "es-ES" | "fr-FR") {
  const [state, setState] = useState<RiskState>({ score: 0, label: "Safe", rationale: "" });
  const textWindowRef = useRef<string>("");
  const lastRationaleRef = useRef<string>("");

  const keywords = useMemo(() => KEYWORDS[lang] ?? KEYWORDS["en-US"], [lang]);
  const highSev = useMemo(() => HIGH_SEVERITY[lang] ?? HIGH_SEVERITY["en-US"], [lang]);

  const computeScamScore = (text: string) => {
    let score = 0;
    let rationale = lastRationaleRef.current;

    // High-severity immediate patterns
    for (const { k, r } of highSev) {
      if (k.test(text)) {
        return { score: 90, rationale: r };
      }
    }

    let hits = 0;
    for (const { k, r } of keywords) {
      if (k.test(text)) {
        score += 35;
        hits++;
        rationale = r;
      }
    }
    // Numeric code pattern (e.g., 6-digit code)
    if (/\b\d{4,8}\b/.test(text)) {
      score += 30;
      rationale = rationale || "numeric code";
    }
    // Money amount + action
    if (/(\$|€)\s?\d{2,}|\d+\s?(dollars|euros)/i.test(text)) {
      score += 20;
      rationale = rationale || "money mention";
    }
    // Boost for multiple cues
    if (hits >= 2) score += 20;

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
    const fused = Math.round(0.7 * scam.score + 0.3 * spoof);

    let label: RiskLabel = "Safe";
    if (fused >= 65) label = "Scam";
    else if (fused >= 30) label = "Suspicious";

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
