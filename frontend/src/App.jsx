import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const ACCEPTED_TYPES = [
  ".mp3",
  ".wav",
  ".opus",
  ".m4a",
  ".aac",
  ".ogg",
  ".flac"
].join(",");

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [health, setHealth] = useState("Checking backend...");
  const [transcriptionState, setTranscriptionState] = useState("idle");

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        const response = await fetch(`${API_BASE}/health`);
        if (!response.ok) {
          throw new Error("Backend health check failed.");
        }

        const data = await response.json();
        if (isMounted) {
          setHealth(`Backend ready - Whisper model: ${data.model}`);
        }
      } catch {
        if (isMounted) {
          setHealth("Backend unavailable. Start the FastAPI server on port 8000.");
        }
      }
    }

    checkHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Choose an audio file before starting transcription.");
      return;
    }

    setError("");
    setResult(null);
    setTranscriptionState("uploading");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_BASE}/transcribe`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Transcription failed.");
      }

      setResult(data);
      setTranscriptionState("success");
    } catch (submitError) {
      setError(submitError.message || "Something went wrong.");
      setTranscriptionState("error");
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError("");
    setTranscriptionState("idle");
  }

  const downloadUrl = result?.document_download_url
    ? `${API_BASE}${result.document_download_url}`
    : "";
  const isTranscribing = transcriptionState === "uploading";

  let progressTitle = "Ready to transcribe";
  let progressMessage = "Choose an audio file, then start transcription.";

  if (isTranscribing) {
    progressTitle = "Transcription in progress";
    progressMessage =
      "Your audio is being processed now. Please keep this page open until the transcript is ready.";
  } else if (transcriptionState === "success") {
    progressTitle = "Transcription complete";
    progressMessage = "Your transcript is ready below and the Word file can be downloaded.";
  } else if (transcriptionState === "error") {
    progressTitle = "Transcription failed";
    progressMessage = "Something went wrong. Check the message below and try again.";
  }

  return (
    <main className="page-shell">
      <div className="background-grid" aria-hidden="true" />
      <section className="workspace-shell">
        <header className="hero-block">
          <span className="mini-pill">Simple AI transcription workspace</span>
          <h1>
            Transcribe audio
            <br />
            and download the result
            <br />
            in one place.
          </h1>
          <p className="lede">
            A clean flow to transcribe your audio files: choose a file, start
            transcription, watch the status, read the transcript, and download the document.
          </p>
          <p className="status-pill">{health}</p>
        </header>

        <section className="workflow-card">
          <div className="workflow-grid">
            <article className="task-card">
              <p className="task-step">Step 1</p>
              <h2>Choose file</h2>
              <label className="primary-button" htmlFor="audio-file">
                {selectedFile ? "Choose a different file" : "Choose audio file"}
              </label>
              <input
                id="audio-file"
                className="sr-only"
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                disabled={isTranscribing}
              />
              <div className="file-card">
                <p className="file-label">Selected file</p>
                <p className="file-name">{selectedFile ? selectedFile.name : "No file chosen yet"}</p>
                <p className="file-hint">Supported: mp3, wav, opus, m4a, aac, ogg, flac</p>
              </div>
            </article>

            <article className="task-card">
              <p className="task-step">Step 2</p>
              <h2>Start transcription</h2>
              <form className="action-stack" onSubmit={handleSubmit}>
                <button className="dark-button" type="submit" disabled={isTranscribing}>
                  {isTranscribing ? "Transcribing..." : "Start transcription"}
                </button>
              </form>
              <p className="helper-copy">
                Start only when you are happy with the selected file. The transcript and document
                will appear below automatically.
              </p>
            </article>
          </div>

          <article className="task-card status-card">
            <p className="task-step">Step 3</p>
            <h2>Transcription state</h2>
            <p className="status-title">{progressTitle}</p>
            <p className="helper-copy">{progressMessage}</p>
            <div className={`progress-track ${isTranscribing ? "active" : transcriptionState}`}>
              <span className="progress-bar" />
            </div>
            {error ? <p className="feedback error">{error}</p> : null}
          </article>

          <div className="results-grid">
            <article className="task-card transcript-card">
              <p className="task-step">Step 4</p>
              <div className="card-head">
                <h2>Transcript</h2>
                <span>{result?.detected_language || "Language pending"}</span>
              </div>
              {result ? (
                <>
                  <div className="meta-row">
                    <span>{result.filename}</span>
                    <span>{result.model}</span>
                  </div>
                  <div className="transcript-box">
                    <p>{result.text || "No text was returned."}</p>
                  </div>
                </>
              ) : (
                <div className={`empty-state ${isTranscribing ? "busy" : ""}`}>
                  <p>
                    {isTranscribing
                      ? "Your transcript will appear here as soon as processing finishes."
                      : "The transcript will appear here after you start transcription."}
                  </p>
                </div>
              )}
            </article>

            <article className="task-card download-card">
              <p className="task-step">Step 5</p>
              <div className="card-head">
                <h2>Download file</h2>
                <span>{result ? "Ready" : isTranscribing ? "Preparing" : "Waiting"}</span>
              </div>
              {result ? (
                <>
                  <p className="download-copy">
                    Your Word document has been created and is ready to download.
                  </p>
                  <a className="dark-button full-width" href={downloadUrl}>
                    Download {result.document_filename}
                  </a>
                  <p className="download-hint">
                    If your browser opens the file directly, use the browser download option to save it.
                  </p>
                </>
              ) : (
                <div className={`empty-state ${isTranscribing ? "busy" : ""}`}>
                  <p>
                    {isTranscribing
                      ? "The download file is being prepared together with the transcript."
                      : "The download button will appear here after transcription is complete."}
                  </p>
                </div>
              )}
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
