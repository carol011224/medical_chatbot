import { useRef, useState } from "react";

type SttResponse = {
  ok: boolean;
  filename?: string;
  bytes?: number;
  wav?: string | null;
  convert_warning?: string | null;
  transcript?: string | null;
  note?: string;
};

export function useVoiceRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState("待命");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SttResponse | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  async function start() {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setStatus("上傳中…");
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("file", blob, "recording.webm");

        try {
          const res = await fetch("/api/stt", { method: "POST", body: form });
          if (!res.ok) {
            throw new Error(`上傳失敗：${res.status} ${await res.text()}`);
          }
          const data = (await res.json()) as SttResponse;
          setResult(data);
          setStatus("上傳完成");
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          setStatus("上傳失敗");
        } finally {
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
      setStatus("錄音中…");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("無法開啟麥克風");
    }
  }

  function stop() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecording(false);
  }

  return { status, error, result, start, stop, isRecording };
}