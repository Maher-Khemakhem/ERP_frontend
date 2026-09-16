import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Barcode, CheckCircle2, Smartphone } from "lucide-react";
import { useApi } from "../../lib/apiClient.jsx";
import { Message } from "../../design/components.jsx";

export default function PhoneScannerPage() {
  const { request } = useApi();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const streamRef = useRef(null);
  const [barcode, setBarcode] = useState("");
  const [message, setMessage] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [lastReadBarcode, setLastReadBarcode] = useState("");
  const [cameraState, setCameraState] = useState("idle");
  const [cameraRequested, setCameraRequested] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const lastDecodedRef = useRef({ value: "", at: 0 });

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("sessionId");
  const token = params.get("token");

  const submitBarcode = useCallback(async (value) => {
    const code = String(value || "").trim();
    if (!code || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setMessage(null);
    try {
      const result = await request(`/api/pos/scanner-sessions/${sessionId}/scans`, {
        method: "POST",
        headers: { "X-Scanner-Token": token || "" },
        body: { barcode: code },
      });
      setLastScan(result);
      setBarcode("");
      if (navigator.vibrate) navigator.vibrate(80);
    } catch (err) {
      setMessage({ ok: false, text: err.message || "Could not send this barcode." });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [request, sessionId, token]);

  useEffect(() => {
    if (!sessionId || !token) {
      setCameraState("invalid");
      return undefined;
    }
    if (!cameraRequested) {
      setCameraState("idle");
      return undefined;
    }

    let cancelled = false;
    let controls = null;
    let stream = null;
    let detectionTimer = null;

    // React StrictMode mounts effects twice in development. Deferring startup
    // by one task prevents the first, immediately-cleaned-up effect from
    // opening a stream that could stop the real stream.
    const startup = window.setTimeout(() => {
      if (cancelled) return;
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
      ]);
      const startCamera = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("This browser does not support camera access.");
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState("ready");

        // Prefer the browser's native detector where available. It is usually
        // faster on phones; ZXing remains the fallback for other browsers.
        let nativeDetector = null;
        if ("BarcodeDetector" in window) {
          try {
            nativeDetector = new window.BarcodeDetector({
              formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "codabar"],
            });
          } catch {
            nativeDetector = null;
          }
        }

        if (nativeDetector) {
          const detectNative = async () => {
            if (cancelled) return;
            try {
              const results = await nativeDetector.detect(videoRef.current);
              const value = results[0]?.rawValue?.trim();
              if (value) {
                const now = Date.now();
                const previous = lastDecodedRef.current;
                if (value !== previous.value || now - previous.at > 1500) {
                  lastDecodedRef.current = { value, at: now };
                  setLastReadBarcode(value);
                  submitBarcode(value);
                }
              }
            } catch {
              // A frame can be unavailable while the camera is focusing.
            }
            if (!cancelled) detectionTimer = window.setTimeout(detectNative, 120);
          };
          detectNative();
          return;
        }

        const reader = new BrowserMultiFormatReader(hints);
        controls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (!result) return;
          const value = result.getText().trim();
          const now = Date.now();
          const previous = lastDecodedRef.current;
          if (value && (value !== previous.value || now - previous.at > 1500)) {
            lastDecodedRef.current = { value, at: now };
            setLastReadBarcode(value);
            submitBarcode(value);
          }
        });
        if (!cancelled) controlsRef.current = controls;
      };

      startCamera().catch((err) => {
        if (!cancelled) {
          setCameraState("error");
          setMessage({ ok: false, text: err.message || "Camera permission was denied." });
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startup);
      if (detectionTimer) window.clearTimeout(detectionTimer);
      controls?.stop();
      if (controlsRef.current === controls) controlsRef.current = null;
      stream?.getTracks().forEach((track) => track.stop());
      if (streamRef.current === stream) streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraRequested, cameraKey, sessionId, token, submitBarcode]);

  function handleStartCamera() {
    setMessage(null);
    setCameraState("starting");
    setCameraRequested(true);
    setCameraKey((key) => key + 1);
  }

  function handleManualSubmit(event) {
    event.preventDefault();
    submitBarcode(barcode);
  }

  return (
    <main className="phone-scanner-page">
      <section className="phone-scanner-card">
        <div className="phone-scanner-brand"><Smartphone size={18} /> Counter · Phone scanner</div>
        <h1>Scan an item</h1>
        <p className="phone-scanner-help">Point your camera at a product barcode. Each successful scan is sent to the open ticket on the PC.</p>

        {!sessionId || !token ? (
          <Message ok={false} text="This scanner link is incomplete. Generate a new pairing link on the PC." />
        ) : (
          <>
            <div className={`camera-frame ${cameraState}`}>
              <video ref={videoRef} muted autoPlay playsInline />
              {cameraState === "ready" && <div className="scan-target" aria-hidden="true" />}
              {cameraState === "idle" && (
                <button type="button" className="camera-action" onClick={handleStartCamera}>
                  Start camera
                </button>
              )}
              {cameraState === "starting" && <span>Starting camera…</span>}
              {cameraState === "invalid" && <span>Invalid pairing</span>}
              {cameraState === "error" && (
                <button type="button" className="camera-action" onClick={handleStartCamera}>
                  Try camera again
                </button>
              )}
            </div>
            {lastReadBarcode && <div className="phone-read-code">Detected: <code>{lastReadBarcode}</code></div>}
            <Message ok={message?.ok} text={message?.text} />
            {lastScan && (
              <div className="phone-scan-success">
                <CheckCircle2 size={17} />
                <span><strong>{lastScan.productName}</strong><small>{lastScan.barcode} · Added to PC ticket</small></span>
              </div>
            )}
            <form className="phone-manual-form" onSubmit={handleManualSubmit}>
              <input value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Or type barcode" inputMode="numeric" aria-label="Barcode" />
              <button className="phone-scan-button" type="submit" disabled={sending || !barcode.trim()}><Barcode size={17} /> Send</button>
            </form>
          </>
        )}
      </section>
      <style>{`
        .phone-scanner-page { min-height: 100vh; background: radial-gradient(circle at 80% 0%, #FFF8E7 0, transparent 34%), var(--paper); padding: 28px 16px; color: var(--ink); }
        .phone-scanner-card { max-width: 520px; margin: 0 auto; background: var(--surface); border: 1px solid var(--hairline); border-radius: 20px; padding: 22px; box-shadow: var(--shadow-md); }
        .phone-scanner-brand { display: flex; align-items: center; gap: 8px; color: var(--green-deep); font-size: 13px; font-weight: 700; }
        .phone-scanner-card h1 { margin: 26px 0 5px; font-family: 'Fraunces', Georgia, serif; font-size: 32px; letter-spacing: -.03em; }
        .phone-scanner-help { color: var(--ink-soft); font-size: 14px; line-height: 1.5; margin-top: 0; }
        .camera-frame { position: relative; overflow: hidden; aspect-ratio: 4 / 3; margin: 18px 0 12px; border-radius: 14px; background: #15271d; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
        .camera-frame video { width: 100%; height: 100%; object-fit: cover; }
        .camera-frame span { position: absolute; padding: 8px 12px; border-radius: 8px; background: rgba(0,0,0,.55); font-size: 13px; }
        .camera-action { position: absolute; border: 0; border-radius: 10px; padding: 13px 18px; background: #8CCBEA; color: var(--green-deep); font-weight: 800; font-size: 14px; cursor: pointer; }
        .scan-target { position: absolute; width: 72%; height: 28%; border: 2px solid rgba(255,255,255,.9); border-radius: 8px; box-shadow: 0 0 0 999px rgba(0,0,0,.16); pointer-events: none; }
        .phone-read-code { margin-top: 8px; color: var(--ink-soft); font-size: 12px; }
        .phone-read-code code { color: var(--ink); font-family: 'IBM Plex Mono', monospace; }
        .phone-scan-success { display: flex; align-items: center; gap: 10px; padding: 11px 12px; margin: 12px 0; color: var(--green-deep); background: #DFECF5; border-radius: 9px; }
        .phone-scan-success span { display: flex; flex-direction: column; gap: 2px; font-size: 14px; }
        .phone-scan-success small { color: var(--ink-soft); font-size: 12px; }
        .phone-manual-form { display: flex; gap: 8px; margin-top: 14px; }
        .phone-manual-form input { min-width: 0; flex: 1; min-height: 46px; padding: 12px; border: 1px solid var(--hairline-strong); border-radius: 10px; font-size: 16px; }
        .phone-scan-button { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 10px; padding: 0 17px; color: #fff; background: var(--green); font-weight: 700; }
        .phone-scan-button:disabled { opacity: .5; }
      `}</style>
    </main>
  );
}
