import { useCallback, useEffect, useRef, useState } from "react";

export type CallMode = "voice" | "video";

export function useCallStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState<CallMode>("voice");

  const start = useCallback(async (m: CallMode) => {
    try {
      setMode(m);
      const constraints: MediaStreamConstraints = m === "video" ? { audio: true, video: { width: 1280, height: 720 } } : { audio: true, video: false };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      return s;
    } catch (e) {
      console.error("Failed to start call stream", e);
      throw e;
    }
  }, []);

  const stop = useCallback(() => {
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { stream, mode, start, stop };
}
