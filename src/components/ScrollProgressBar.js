import React, { useEffect, useState } from "react";

export default function ScrollProgressBar() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalPageHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalPageHeight > 0) {
        const progress = (window.pageYOffset / totalPageHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
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
