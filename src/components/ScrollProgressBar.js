import React, { useEffect, useState } from "react";

export default function ScrollProgressBar() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let frameId = null;
    let previousProgress = 0;

    const updateProgress = () => {
      frameId = null;
      const totalPageHeight = document.documentElement.scrollHeight - window.innerHeight;
      const next = totalPageHeight > 0
        ? Math.min(100, Math.max(0, (window.pageYOffset / totalPageHeight) * 100))
        : 0;

      if (Math.abs(previousProgress - next) >= 0.5 || next === 0 || next === 100) {
        previousProgress = next;
        setScrollProgress(next);
      }
    };

    const handleScroll = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateProgress);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "5px",
        height: "100%",
        background: "rgba(255, 255, 255, 0.05)",
        zIndex: 9999,
        pointerEvents: "none"
      }}
    >
      <div
        style={{
          width: "100%",
          height: `${scrollProgress}%`,
          background: "linear-gradient(to bottom, var(--color-primary, #6366f1), var(--color-accent, #14b8a6))",
          opacity: scrollProgress > 0 ? 0.9 : 0,
          transition: "height 0.1s ease-out, opacity 0.3s ease",
          boxShadow: "0 0 10px var(--color-primary, #6366f1)"
        }}
      />
    </div>
  );
}
