import { useVoiceRecorder } from "./useVoiceRecorder";

export default function App() {
  const {
    status,
    error,
    result,
    start,
    stop,
    isRecording,
  } = useVoiceRecorder();

  return (
    <main className="page">
      <h1>臺醫通</h1>
      <p className="sub">按住說話 → 上傳音訊（初版華語 demo）</p>

      <button
        className={isRecording ? "mic recording" : "mic"}
        onClick={isRecording ? stop : start}
        type="button"
      >
        {isRecording ? "停止並上傳" : "開始錄音"}
      </button>

      <p className="status">狀態：{status}</p>
      {error && <p className="error">{error}</p>}
      {result && (
        <pre className="result">{JSON.stringify(result, null, 2)}</pre>
      )}
    </main>
  );
}