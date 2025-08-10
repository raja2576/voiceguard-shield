import { useCallback, useEffect, useRef, useState } from "react";

export type AudioMetrics = {
  volume: number; // 0..1
  spectralCentroid: number; // Hz approx
  flatness: number; // 0..1
  zeroCrossRate: number; // 0..1
  spoofScore: number; // 0..1 heuristic
};

export function useAudioAnalysis() {
  const [metrics, setMetrics] = useState<AudioMetrics>({
    volume: 0,
    spectralCentroid: 0,
    flatness: 0,
    zeroCrossRate: 0,
    spoofScore: 0,
  });
  const [active, setActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    setActive(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    analyserRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    analyserRef.current = null;
    sourceRef.current = null;
    audioCtxRef.current = null;
  }, []);

  const start = useCallback(async (providedStream?: MediaStream) => {
    try {
      const stream = providedStream ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setActive(true);

      const freqData = new Float32Array(analyser.frequencyBinCount);
      const timeData = new Float32Array(analyser.fftSize);

      const sampleRate = audioCtx.sampleRate;

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatFrequencyData(freqData);
        analyserRef.current.getFloatTimeDomainData(timeData);

        // Volume approximation (RMS)
        let sumSq = 0;
        for (let i = 0; i < timeData.length; i++) {
          sumSq += timeData[i] * timeData[i];
        }
        const rms = Math.sqrt(sumSq / timeData.length);

        // Spectral Centroid
        let magSum = 0;
        let weighted = 0;
        for (let i = 0; i < freqData.length; i++) {
          const mag = Math.pow(10, freqData[i] / 20); // convert dB to lin
          const freq = (i * sampleRate) / (2 * freqData.length);
          magSum += mag;
          weighted += mag * freq;
        }
        const centroid = magSum > 0 ? weighted / magSum : 0;

        // Spectral Flatness (geometric mean / arithmetic mean)
        let geom = 0;
        let arith = 0;
        const n = freqData.length;
        for (let i = 0; i < n; i++) {
          const mag = Math.max(1e-8, Math.pow(10, freqData[i] / 20));
          geom += Math.log(mag);
          arith += mag;
        }
        const flatness = Math.exp(geom / n) / (arith / n);

        // Zero-Crossing Rate
        let zc = 0;
        for (let i = 1; i < timeData.length; i++) {
          if ((timeData[i - 1] <= 0 && timeData[i] > 0) || (timeData[i - 1] >= 0 && timeData[i] < 0)) {
            zc++;
          }
        }
        const zcr = zc / timeData.length;

        // Heuristic spoof score: flatter spectrum + moderate centroid + low RMS variance
        // Normalize features roughly
        const flatScore = Math.min(1, flatness * 5); // more weight to higher flatness
        const centroidNorm = Math.min(1, centroid / 4000); // 0..~1 for 4kHz
        const volumeScore = Math.min(1, rms * 10);
        const spoof = Math.max(0, flatScore * 0.6 + (1 - Math.abs(centroidNorm - 0.4)) * 0.3 + (1 - volumeScore) * 0.1);

        setMetrics({
          volume: Math.min(1, rms * 2.5),
          spectralCentroid: centroid,
          flatness,
          zeroCrossRate: zcr,
          spoofScore: Math.max(0, Math.min(1, spoof)),
        });

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      console.error(e);
      stop();
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { active, metrics, start, stop };
}
