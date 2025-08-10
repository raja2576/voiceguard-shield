import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { FloatingRiskWidget } from "@/components/vss/FloatingRiskWidget";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useSpeech } from "@/hooks/useSpeech";
import { useRiskEngine } from "@/hooks/useRiskEngine";
import { useTTSAlert } from "@/components/vss/TTSAlert";
import { Mic, StopCircle, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  // UI state
  const [lang, setLang] = useState<"en-US" | "es-ES" | "fr-FR">("en-US");
  const [running, setRunning] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [enableTTS, setEnableTTS] = useState(true);
  const [volume, setVolume] = useState(0.6);

  // Engines
  const { active, metrics, start: startAudio, stop: stopAudio } = useAudioAnalysis();
  const { status, interim, finalText, start: startSpeech, stop: stopSpeech, setFinalText } = useSpeech(lang);
  const { state, pushUpdate, reset } = useRiskEngine(lang);
  const { speak, stop: stopSpeak } = useTTSAlert();

  const lastAlertedRef = useRef<number>(0);
  const prevSeverityRef = useRef<number>(0);

  const ttsMessages = useMemo(() => ({
    "en-US": "Attention: possible fraud detected. Do not share codes or personal information.",
    "es-ES": "Atención: posible fraude detectado. No comparta códigos ni información personal.",
    "fr-FR": "Attention : fraude possible détectée. Ne partagez pas de codes ni d'informations personnelles.",
  }), []);

  const startDetection = async () => {
    reset();
    setFinalText("");
    await startAudio();
    await startSpeech();
    setRunning(true);
    setShowWidget(true);
  };

  const stopDetection = () => {
    stopAudio();
    stopSpeech();
    stopSpeak();
    setRunning(false);
  };

  // Push text updates to risk engine
  useEffect(() => {
    if (interim) pushUpdate({ text: interim });
  }, [interim, pushUpdate]);

  useEffect(() => {
    if (finalText) pushUpdate({ text: finalText });
  }, [finalText, pushUpdate]);

  // Push spoof score updates
  useEffect(() => {
    if (!active) return;
    pushUpdate({ spoofScore: metrics.spoofScore });
  }, [active, metrics.spoofScore, pushUpdate]);

  // Trigger discreet TTS on escalation (also on high Suspicious)
  useEffect(() => {
    const now = Date.now();
    const highSuspicious = state.label === "Suspicious" && state.score >= 50;
    if (enableTTS && (state.label === "Scam" || highSuspicious) && now - lastAlertedRef.current > 4000) {
      speak({ text: ttsMessages[lang], lang, volume: volume, rate: 0.95 });
      lastAlertedRef.current = now;
    }
  }, [state.label, state.score, enableTTS, speak, ttsMessages, lang, volume]);

  // Visual toast on severity increase
  useEffect(() => {
    const sevMap: Record<string, number> = { Safe: 0, Suspicious: 1, Scam: 2 };
    const current = sevMap[state.label] ?? 0;
    if (current > prevSeverityRef.current) {
      toast({
        title: current === 2 ? "High risk: possible fraud" : "Warning: suspicious activity",
        description: state.rationale ? `Reason: ${state.rationale}` : undefined,
      });
    }
    prevSeverityRef.current = current;
  }, [state.label, state.rationale]);

  // Signature interaction: soft spotlight follows cursor
  const heroRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="relative overflow-hidden">
        <div
          ref={heroRef}
          className="relative isolate"
          style={{
            background: `radial-gradient(600px 300px at var(--mx,50%) var(--my,30%), hsl(var(--accent) / 0.15), transparent 60%)`,
          }}
        >
          <section className="container py-20 md:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <BadgeHero />
              <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight">
                Voice Scam Shield — Real-Time Scam and Deepfake Detection
              </h1>
              <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                Protect your calls with live risk scoring, multilingual analysis (EN/ES/FR), and discreet alerts within 2 seconds.
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                {!running ? (
                  <Button variant="hero" size="lg" onClick={startDetection}>
                    <Mic className="mr-2" /> Start Live Detection
                  </Button>
                ) : (
                  <Button variant="destructive" size="lg" onClick={stopDetection}>
                    <StopCircle className="mr-2" /> Stop Detection
                  </Button>
                )}
                <a href="#demo" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <Sparkles className="size-4" /> See how it works
                </a>
              </div>
            </div>
          </section>
        </div>
      </header>

      <main className="container pb-24">
        <section id="demo" className="grid md:grid-cols-2 gap-6">
          <Card className="card-glass">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Live Settings</h2>
                <p className="text-sm text-muted-foreground">Tune language and alerts. Your audio stays on-device in this prototype.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={lang} onValueChange={(v) => setLang(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                      <SelectItem value="fr-FR">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label>Whisper Alert (TTS)</Label>
                    <p className="text-xs text-muted-foreground">Discreet spoken warnings</p>
                  </div>
                  <Switch checked={enableTTS} onCheckedChange={setEnableTTS} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Alert Volume</Label>
                <Slider value={[Math.round(volume * 100)]} onValueChange={(v) => setVolume((v[0] ?? 60) / 100)} />
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-sm">
                <InfoTile label="Status" value={running ? (status === "listening" ? "Listening" : "Starting...") : "Idle"} />
                <InfoTile label="Volume" value={`${Math.round(metrics.volume * 100)}%`} />
                <InfoTile label="Spoof" value={`${Math.round(metrics.spoofScore * 100)}%`} />
              </div>

              <div className="rounded-md border p-3 text-sm h-28 overflow-auto">
                <span className="font-medium">Transcript: </span>
                <span className="text-muted-foreground">{interim || finalText || "—"}</span>
              </div>

              <div className="flex gap-3">
                {!running ? (
                  <Button onClick={startDetection} className="flex-1">
                    <Mic className="mr-2" /> Start
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={stopDetection} className="flex-1">
                    <StopCircle className="mr-2" /> Stop
                  </Button>
                )}
                <Button variant="outline" onClick={() => { reset(); setFinalText(""); }}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">How detection works</h2>
                <p className="text-sm text-muted-foreground">We combine a keyword/pattern scam check with a realtime voice spoof heuristic — all client-side in this prototype.</p>
              </div>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Detects OTP requests, payment mentions, urgency cues.</li>
                <li>Heuristic anti-spoof score from audio features (flatness, centroid).</li>
                <li>Fusion model yields Safe, Suspicious, or Scam within ~2s.</li>
              </ul>
              <div className="rounded-md border p-4 flex items-start gap-3">
                <ShieldAlert className="mt-0.5 text-primary" />
                <p className="text-sm text-muted-foreground">Production will stream to a secure backend for ASR, anti-spoofing, and reports. This demo keeps audio in your browser.</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <FloatingRiskWidget
        open={showWidget}
        score={state.score}
        label={state.label}
        rationale={state.rationale}
        onHangUp={() => stopDetection()}
        onMarkSafe={() => reset()}
      />
    </div>
  );
};

const BadgeHero = () => (
  <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
    Multilingual real-time protection
  </div>
);

const InfoTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-semibold">{value}</div>
  </div>
);

export default Index;
