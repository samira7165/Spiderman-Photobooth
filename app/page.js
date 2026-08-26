"use client";

import { useEffect, useRef, useState } from "react";
import { resizeImageToDataUrl } from "@/lib/client-image";

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

function MagneticButton({ children, className, strength = 0.25, ...props }) {
  const ref = useRef(null);

  function handleMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    el.style.transition = "transform 0.1s ease-out";
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.transform = "translate(0px, 0px)";
  }

  return (
    <button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

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
  const [facingMode, setFacingMode] = useState("user"); // 'user' = front, 'environment' = back
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
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

  // Only relevant on the device the booth actually runs on (phone/tablet) —
  // desktops with a single (or no) webcam just never see the switch button.
  // Checked again after a successful getUserMedia() below — Safari on iOS
  // often under-reports (or fully hides) camera devices from
  // enumerateDevices() until the origin has actually been granted camera
  // permission at least once, so a pre-permission check alone can wrongly
  // conclude there's only one camera on a phone that actually has two.
  async function checkMultipleCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setHasMultipleCameras(videoInputs.length > 1);
    } catch {
      // leave hasMultipleCameras as-is
    }
  }

  useEffect(() => {
    checkMultipleCameras();
  }, []);

  async function startCamera(facing = facingMode) {
    setCameraError("");
    setStep("camera");

    // getUserMedia is only exposed in secure contexts (HTTPS or localhost) —
    // on plain HTTP it's simply undefined, so this gives a specific,
    // actionable message instead of a confusing generic failure.
    if (
      window.location.protocol === "http:" &&
      window.location.hostname !== "localhost"
    ) {
      setCameraError(
        "Camera requires HTTPS. Please access this page via https:// or localhost."
      );
      return;
    }

    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setFacingMode(facing);
      checkMultipleCameras();
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

  function switchCamera() {
    startCamera(facingMode === "user" ? "environment" : "user");
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

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Downscaled client-side before upload — an unresized phone photo
      // (commonly 3-8MB) exceeds Vercel's 4.5MB serverless function body
      // limit once base64-encoded, and gets rejected outright.
      const dataUrl = await resizeImageToDataUrl(file, 2000, 0.9);
      setPhoto(dataUrl);
      stopCamera();
      setStep("review");
    } catch (err) {
      console.error("File upload error:", err);
      setCameraError("Could not read that photo. Try a different file.");
    }
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

  const isProcessing = step === "waiting" && queueStatus === "processing";

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <div className="pb-shell">
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/spidy2.jpg)" }}
      />
      <div
        className={`fixed inset-0 -z-10 transition-colors duration-700 ${
          isProcessing ? "bg-red-950/45" : "bg-[#0a0a0a]/25"
        }`}
      />

      <div className="pb-header">
        <img
          src="/spider_man_4_brand_new_day_.png"
          alt="Spiderman Photobooth"
          className="pb-logo"
        />
        <p className="pb-tagline">
          Take a photo, pick a suit, become Spider-Man
        </p>
      </div>

      <div className="pb-content w-full portrait:w-[92vw] portrait:max-w-4xl landscape:max-w-md landscape:md:max-w-2xl landscape:lg:max-w-3xl">
        {step === "form" && hallChecked && !hall && (
          <div className="pb-banner bg-red-950/40 border border-red-900/50 text-red-400 text-sm rounded-xl p-3">
            This booth isn&apos;t configured — open it with a hall in the
            URL, e.g. <span className="font-mono">?hall=1</span>.
          </div>
        )}

        {step === "form" && (
          <div className="pb-form">
            <div className="pb-fields">
              <div>
                <label className="pb-field-label">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="pb-input"
                />
              </div>
              <div>
                <label className="pb-field-label">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number"
                  className="pb-input"
                />
              </div>
            </div>

            <label className="pb-grid-label">Choose a template</label>
            <div className="pb-grid-wrap">
              <div className="pb-grid">
                {templates.map((t) => (
                  <MagneticButton
                    key={t.id}
                    type="button"
                    strength={0.15}
                    onClick={() => setTemplateId(t.id)}
                    className={`pb-cell ${
                      templateId === t.id ? "pb-cell-selected" : ""
                    }`}
                  >
                    <img
                      src={t.referenceImage}
                      alt={t.name}
                      className="pb-cell-img"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </MagneticButton>
                ))}
              </div>
            </div>

            <MagneticButton
              type="button"
              disabled={!canProceedToCamera}
              onClick={() => setStep("preview")}
              className="pb-cta"
            >
              Next: Take Photo <span aria-hidden="true">→</span>
            </MagneticButton>
          </div>
        )}

        {step === "preview" && selectedTemplate && (
          <div className="pb-scroll space-y-4 mx-auto w-full landscape:max-w-xs portrait:max-w-md">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden aspect-[4/5] max-h-[60vh]">
              <img
                src={selectedTemplate.referenceImage}
                alt={selectedTemplate.name}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-center text-white font-medium">
              {selectedTemplate.name}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="flex-1 bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-white text-sm font-medium py-3 rounded-xl transition-colors"
              >
                ← Back
              </button>
              <MagneticButton
                type="button"
                onClick={() => startCamera()}
                className="flex-1 bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Confirm
              </MagneticButton>
            </div>
          </div>
        )}

        {step === "camera" && (
          <div className="pb-scroll space-y-4">
            <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
              {cameraError ? (
                <p className="text-[#8a8a8a] text-sm text-center px-6">
                  {cameraError}
                </p>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${
                      facingMode === "user" ? "scale-x-[-1]" : ""
                    }`}
                  />

                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[11px]">
                    {facingMode === "user" ? "Front Camera" : "Back Camera"}
                  </div>

                  {hasMultipleCameras && (
                    <button
                      type="button"
                      onClick={switchCamera}
                      title={
                        facingMode === "user"
                          ? "Switch to back camera"
                          : "Switch to front camera"
                      }
                      className="absolute top-3 right-3 w-11 h-11 rounded-full bg-black/60 hover:bg-black/75 border border-white/30 backdrop-blur text-white text-xl flex items-center justify-center transition-colors"
                    >
                      🔄
                    </button>
                  )}
                </>
              )}
            </div>

            {!cameraError && (
              <MagneticButton
                onClick={capturePhoto}
                className="w-full bg-red-900 hover:bg-red-800 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Capture
              </MagneticButton>
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
          <div className="pb-scroll space-y-4">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden aspect-square">
              <img src={photo} alt="Captured" className="w-full h-full object-cover" />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <MagneticButton
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {submitting ? "Submitting..." : "Looks Good, Submit"}
            </MagneticButton>
            <button
              onClick={retake}
              className="w-full bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Retake
            </button>
          </div>
        )}

        {step === "waiting" && (
          <div className="pb-scroll rounded-2xl p-6 sm:p-8 text-center space-y-4 border transition-colors duration-700 bg-gradient-to-br from-red-950 via-[#2a0808] to-black border-red-900">
            <div className="relative mx-auto" style={{ width: 240, height: 78, maxWidth: "100%" }}>
              <svg
                viewBox="0 0 240 78"
                width="240"
                height="78"
                className="absolute inset-0"
              >
                <path
                  d="M8,39 C42,5 78,73 118,39 C158,5 194,73 232,39"
                  stroke="#7a1f1f"
                  strokeWidth="2"
                  strokeDasharray="5 6"
                  fill="none"
                />
              </svg>
              <div className="spider-crawler text-2xl sm:text-3xl">🕷️</div>
            </div>
            <div className="flex items-end justify-center gap-1.5 h-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="loading-block w-3 h-full rounded-sm"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
            <p className="text-white font-semibold text-lg">
              {isProcessing
                ? "Your picture is almost loading..."
                : "Waiting in the queue..."}
            </p>
            {!isProcessing && queuePosition != null && (
              <p className="text-[#c98a8a] text-sm">
                Position in queue: #{queuePosition}
              </p>
            )}
            <p className="text-[#c98a8a]/70 text-xs">Request ID: {requestId}</p>
          </div>
        )}

        {step === "done" && result && (
          <div className="pb-scroll space-y-4">
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

            <MagneticButton
              onClick={startOver}
              className="w-full bg-red-900 hover:bg-red-800 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Take Another Photo
            </MagneticButton>
          </div>
        )}

        {step === "failed" && (
          <div className="pb-scroll space-y-4">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 text-center">
              <p className="text-red-400 font-medium mb-1">Generation failed</p>
              <p className="text-[#8a8a8a] text-xs">{error}</p>
            </div>
            <MagneticButton
              onClick={startOver}
              className="w-full bg-red-900 hover:bg-red-800 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Start Over
            </MagneticButton>
          </div>
        )}
      </div>
    </div>
  );
}
