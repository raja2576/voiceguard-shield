type SpeakOptions = {
  text: string;
  lang?: "en-US" | "es-ES" | "fr-FR";
  volume?: number; // 0..1
  rate?: number; // 0.5..2
};

export function useTTSAlert() {
  const speak = ({ text, lang = "en-US", volume = 0.7, rate = 0.95 }: SpeakOptions) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.volume = Math.min(1, Math.max(0, volume));
    utter.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const stop = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
  };

  return { speak, stop };
}
