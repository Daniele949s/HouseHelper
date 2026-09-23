import React, { useEffect, useRef } from "react";
import guyData from "./guyFramesData.json";

// Sequenza fotogrammi e tempistiche della spyglass animation da guy.scss
const ANIMATION_SEQUENCE = [
  { frame: "guybrush-spyglass-1", dur: 70 },
  { frame: "guybrush-spyglass-2", dur: 70 },
  { frame: "guybrush-spyglass-3", dur: 70 },
  { frame: "guybrush-spyglass-4", dur: 70 },
  { frame: "guybrush-spyglass-5", dur: 70 },
  { frame: "guybrush-spyglass-6", dur: 70 },
  { frame: "guybrush-spyglass-7", dur: 70 },
  { frame: "guybrush-spyglass-8", dur: 70 },
  { frame: "guybrush-spyglass-9", dur: 70 },
  { frame: "guybrush-spyglass-10", dur: 70 },
  { frame: "guybrush-spyglass-11", dur: 350 },
  { frame: "guybrush-spyglass-12", dur: 70 },
  { frame: "guybrush-spyglass-11", dur: 70 },
  { frame: "guybrush-spyglass-10", dur: 70 },
  { frame: "guybrush-spyglass-9", dur: 70 },
  { frame: "guybrush-spyglass-8", dur: 70 },
  { frame: "guybrush-spyglass-7", dur: 350 },
  { frame: "guybrush-spyglass-8", dur: 70 },
  { frame: "guybrush-spyglass-9", dur: 70 },
  { frame: "guybrush-spyglass-10", dur: 70 },
  { frame: "guybrush-spyglass-10-blink", dur: 70 },
  { frame: "guybrush-spyglass-11", dur: 70 },
  { frame: "guybrush-spyglass-12", dur: 70 },
  { frame: "guybrush-spyglass-13", dur: 900 },
  { frame: "guybrush-spyglass-14", dur: 70 },
  { frame: "guybrush-spyglass-14-blink", dur: 70 },
  { frame: "guybrush-spyglass-14", dur: 70 },
  { frame: "guybrush-spyglass-13", dur: 70 },
  { frame: "guybrush-spyglass-12", dur: 70 },
  { frame: "guybrush-spyglass-11", dur: 70 },
  { frame: "guybrush-spyglass-10", dur: 70 },
  { frame: "guybrush-spyglass-9", dur: 70 },
  { frame: "guybrush-spyglass-8", dur: 70 },
  { frame: "guybrush-spyglass-7", dur: 70 },
  { frame: "guybrush-spyglass-6", dur: 70 },
  { frame: "guybrush-spyglass-4", dur: 70 },
  { frame: "guybrush-spyglass-3", dur: 70 },
  { frame: "guybrush-spyglass-2", dur: 70 },
  { frame: "guybrush-spyglass-1", dur: 1200 }
];

export default function MiniGuy() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const grid = guyData.grid || 36;
    const pixelSize = 1; // 1 pixel su canvas = 36x24 resolution ultra-leggera
    const width = 36;
    const height = 25;

    canvas.width = width;
    canvas.height = height;

    let seqIdx = 0;
    let timer = null;

    const drawFrame = (frameName) => {
      const data = guyData.framesData[frameName];
      if (!data) return;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < data.length; i++) {
        const colorId = data[i];
        if (colorId > 0 && guyData.colors[colorId]) {
          const col = i % grid;
          const row = Math.floor(i / grid);
          ctx.fillStyle = guyData.colors[colorId];
          ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
        }
      }
    };

    const nextFrame = () => {
      const current = ANIMATION_SEQUENCE[seqIdx];
      drawFrame(current.frame);

      seqIdx = (seqIdx + 1) % ANIMATION_SEQUENCE.length;
      timer = setTimeout(nextFrame, current.dur);
    };

    nextFrame();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div
      className="mini-guy-container"
      title="Guybrush Threepwood fa la guardia alla casa 🏴‍☠️"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: "var(--radius-sm)",
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid var(--border-color)",
        transition: "all 0.25s ease"
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "48px",
          height: "33px",
          imageRendering: "pixelated"
        }}
      />
    </div>
  );
}
