"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { img } from "@/lib/client";

type Props = { name: string; images: string[]; spinImages: string[]; model3dUrl?: string; activeImage?: string };
type Mode = "gallery" | "spin" | "model";

/** Product media: image gallery, drag-to-rotate 360° turntable (frame sequence) and an interactive 3D (.glb) model. */
export default function Viewer360({ name, images, spinImages, model3dUrl, activeImage }: Props) {
  const modes: Mode[] = [];
  if (model3dUrl) modes.push("model");
  if (spinImages.length > 1) modes.push("spin");
  modes.push("gallery");
  const [mode, setMode] = useState<Mode>(modes[0]);
  const [shot, setShot] = useState(0);
  const labels: Record<Mode, string> = { model: "3D + AR", spin: "360°", gallery: "ছবি" };

  useEffect(() => { if (activeImage) { const i = images.indexOf(activeImage); if (i >= 0) { setShot(i); setMode("gallery"); } } }, [activeImage, images]);

  return (
    <div className="viewer">
      <div className="viewer-stage">
        {mode === "model" && model3dUrl && <Model3D src={model3dUrl} name={name} poster={images[0]} />}
        {mode === "spin" && <Spin frames={spinImages} name={name} />}
        {mode === "gallery" && (images.length ? <img src={img(images[shot] || images[0], 900)} alt={name} className="viewer-img" /> : <div className="viewer-empty">📦</div>)}
      </div>
      {modes.length > 1 && (
        <div className="viewer-tabs" role="tablist">
          {modes.map((m) => <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{labels[m]}</button>)}
        </div>
      )}
      {mode === "gallery" && images.length > 1 && (
        <div className="thumbs">{images.map((u, i) => <button key={u + i} className={i === shot ? "on" : ""} onClick={() => setShot(i)} aria-label={`ছবি ${i + 1}`}><img src={img(u, 140)} alt="" loading="lazy" /></button>)}</div>
      )}
    </div>
  );
}

function Spin({ frames, name }: { frames: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [hint, setHint] = useState(true);
  const drag = useRef<{ x: number; i: number } | null>(null);
  const auto = useRef(true);
  const n = frames.length;

  useEffect(() => { // preload all frames so rotation is smooth
    let alive = true; let c = 0;
    frames.forEach((u) => { const im = new Image(); im.onload = im.onerror = () => { c++; if (alive) setLoaded(c); }; im.src = img(u, 900); });
    return () => { alive = false; };
  }, [frames]);

  useEffect(() => { // gentle auto-rotate until the visitor touches it
    if (loaded < n) return;
    const t = setInterval(() => { if (auto.current) setIdx((i) => (i + 1) % n); }, 90);
    return () => clearInterval(t);
  }, [loaded, n]);

  const move = useCallback((clientX: number, width: number) => {
    if (!drag.current) return;
    const step = width / n / 1.3; // one full drag across the stage ≈ 0.77 of a turn
    const d = Math.round((clientX - drag.current.x) / step);
    setIdx((((drag.current.i - d) % n) + n) % n);
  }, [n]);

  return (
    <div className="spin" role="img" aria-label={`${name} — ৩৬০ ডিগ্রি ভিউ, ড্র্যাগ করে ঘুরান`}
      onPointerDown={(e) => { auto.current = false; setHint(false); drag.current = { x: e.clientX, i: idx }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => move(e.clientX, (e.currentTarget as HTMLElement).clientWidth)}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") { auto.current = false; setIdx((i) => (i - 1 + n) % n); } if (e.key === "ArrowRight") { auto.current = false; setIdx((i) => (i + 1) % n); } }} tabIndex={0}>
      <img src={img(frames[idx], 900)} alt="" draggable={false} className="viewer-img" />
      {loaded < n && <div className="spin-load">লোড হচ্ছে {Math.round((loaded / n) * 100)}%</div>}
      {hint && loaded >= n && <div className="spin-hint">⟲ ড্র্যাগ করে চারদিকে ঘুরান</div>}
    </div>
  );
}

function Model3D({ src, name, poster }: { src: string; name: string; poster?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { import("@google/model-viewer").then(() => setReady(true)).catch(() => setReady(false)); }, []);
  if (!ready) return <div className="viewer-empty">3D লোড হচ্ছে…</div>;
  return (
    <model-viewer src={src} alt={`${name} 3D মডেল`} poster={poster ? img(poster, 900) : undefined} camera-controls="" auto-rotate="" ar="" ar-modes="webxr scene-viewer quick-look"
      shadow-intensity="1" touch-action="pan-y" style={{ width: "100%", height: "100%", background: "transparent" }}>
      <button slot="ar-button" className="small-btn" style={{ position: "absolute", bottom: 14, right: 14 }}>📱 AR এ দেখুন</button>
    </model-viewer>
  );
}
