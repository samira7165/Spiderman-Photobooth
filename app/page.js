"use client";

import { useEffect, useRef, useState } from "react";

// =============================================================
// GUEST BOOTH PAGE (for testing the full pipeline)
// =============================================================
// Flow: form (name/phone/template) -> camera -> review ->
// submit -> poll status -> show result link.
//
// hall comes from the URL query param (?hall=1..4) — each hall's
// physical device opens this page with its own hall number, so 4
// halls can run simultaneously against one shared backend.
// =============================================================

export default function Home() {
  const [step, setStep] = useState("form");
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hall, setHall] = useState(null);
  const [hallChecked, setHallChecked] = useState(false);
  const [templateId, setTemplateId] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [requestId, setRequestId] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then(setTemplates)
      .catch((err) => console.error("Failed to load templates:", err));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hallParam = parseInt(params.get("hall"), 10);
    setHall([1, 2, 3, 4].includes(hallParam) ? hallParam : null);
    setHallChecked(true);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  async function startCamera() {
    setCameraError("");
    setStep("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(
        "Could not access camera. You can upload a photo instead."
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    setPhoto(canvas.toDataURL("image/jpeg", 0.9));
    stopCamera();
    setStep("review");
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result);
      stopCamera();
      setStep("review");
    };
    reader.readAsDataURL(file);
  }

  function retake() {
    setPhoto(null);
    startCamera();
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, hall, templateId, photo }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setSubmitting(false);
        return;
      }

      setRequestId(data.requestId);
      setQueuePosition(data.position);
      setStep("waiting");
      pollRef.current = setInterval(() => pollStatus(data.requestId), 2500);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Could not submit. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  async function pollStatus(id) {
    try {
      const res = await fetch(`/api/status/${id}`);
      const data = await res.json();

      if (data.status === "completed") {
        clearInterval(pollRef.current);
        setResult({
          code: data.code,
          imageUrl: data.imageUrl,
          viewerUrl: `${window.location.origin}/view/${data.code}`,
        });
        setStep("done");
      } else if (data.status === "failed") {
        clearInterval(pollRef.current);
        setError(data.error || "Image generation failed");
        setStep("failed");
      } else {
        setQueueStatus(data.status);
        setQueuePosition(data.position);
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(result.viewerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function startOver() {
    clearInterval(pollRef.current);
    setStep("form");
    setName("");
    setPhone("");
    setTemplateId(null);
    setPhoto(null);
    setRequestId(null);
    setQueuePosition(null);
    setQueueStatus(null);
    setResult(null);
    setError("");
    setSubmitting(false);
  }

  const canProceedToCamera = name.trim() && phone.trim() && templateId && hall;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">🕷️ Spiderman Photobooth</h1>
        <p className="text-sm text-[#8a8a8a] mt-1">
          Take a photo, pick a suit, become Spider-Man
        </p>
      </div>

      <div className="w-full max-w-md">
        {step === "form" && hallChecked && !hall && (
          <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm rounded-xl p-4 mb-5">
            This booth isn&apos;t configured — open it with a hall in the
            URL, e.g. <span className="font-mono">?hall=1</span>.
          </div>
        )}

        {step === "form" && (
          <div className="space-y-5">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
              <div>
                <label className="block text-xs text-[#8a8a8a] mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8a8a8a] mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-red-900/50 focus:border-red-800 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#8a8a8a] mb-2 px-1">
                Choose a template
              </label>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={`rounded-xl overflow-hidden border transition-colors text-left ${
                      templateId === t.id
                        ? "border-red-800 ring-2 ring-red-900/50"
                        : "border-[#2a2a2a] hover:border-[#3a3a3a]"
                    }`}
                  >
                    <div className="aspect-square bg-[#141414] flex items-center justify-center overflow-hidden">
                      <img
                        src={t.referenceImage}
                        alt={t.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                    <div className="px-2 py-1.5 bg-[#141414] text-xs text-white truncate">
                      {t.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!canProceedToCamera}
              onClick={startCamera}
              className="w-full bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Next: Take Photo
            </button>
          </div>
        )}

        {step === "camera" && (
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
              {cameraError ? (
                <p className="text-[#8a8a8a] text-sm text-center px-6">
                  {cameraError}
                </p>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}
            </div>

            {!cameraError && (
              <button
                onClick={capturePhoto}
                className="w-full bg-red-900 hover:bg-red-800 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Capture
              </button>
            )}

            <label className="block cursor-pointer text-center bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-white text-sm font-medium py-3 rounded-xl transition-colors">
              Upload a Photo Instead
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            <button
              onClick={() => {
                stopCamera();
                setStep("form");
              }}
              className="w-full text-[#8a8a8a] text-sm py-2"
            >
              ← Back
            </button>
          </div>
        )}

        {step === "review" && photo && (
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden aspect-square">
              <img src={photo} alt="Captured" className="w-full h-full object-cover" />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {submitting ? "Submitting..." : "Looks Good, Submit"}
            </button>
            <button
              onClick={retake}
              className="w-full bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Retake
            </button>
          </div>
        )}

        {step === "waiting" && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full border-2 border-red-900 border-t-transparent animate-spin" />
            <p className="text-white font-medium">
              {queueStatus === "processing"
                ? "Generating your Spider-Man photo..."
                : "Waiting in the queue..."}
            </p>
            {queueStatus !== "processing" && queuePosition != null && (
              <p className="text-[#8a8a8a] text-sm">
                Position in queue: #{queuePosition}
              </p>
            )}
            <p className="text-[#6a6a6a] text-xs">Request ID: {requestId}</p>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
              <img src={result.imageUrl} alt="Your Spiderman photo" className="w-full h-auto" />
            </div>

            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4">
              <p className="text-xs text-[#8a8a8a] mb-1">Code</p>
              <p className="font-mono text-red-400 text-sm mb-3">{result.code}</p>

              <p className="text-xs text-[#8a8a8a] mb-1">Your photo link</p>
              <div className="flex items-center gap-2">
                <a
                  href={result.viewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-red-400 hover:text-red-300 text-sm underline underline-offset-2 truncate"
                >
                  {result.viewerUrl}
                </a>
                <button
                  onClick={handleCopyLink}
                  className="shrink-0 text-xs bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <button
              onClick={startOver}
              className="w-full bg-red-900 hover:bg-red-800 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Take Another Photo
            </button>
          </div>
        )}

        {step === "failed" && (
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 text-center">
              <p className="text-red-400 font-medium mb-1">Generation failed</p>
              <p className="text-[#8a8a8a] text-xs">{error}</p>
            </div>
            <button
              onClick={startOver}
              className="w-full bg-red-900 hover:bg-red-800 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Start Over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
