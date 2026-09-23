import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const IMAGES = [
  "/bg_images/bg01.jpg",
  "/bg_images/bg02.jpg",
  "/bg_images/bg03.jpg"
];

export default function BackgroundSlideshow() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const location = useLocation();

  // Show rich animated slideshow on landing and auth pages, subtle on app interior
  const isAuthPage = ["/", "/login", "/registrazione", "/scelta-casa"].includes(location.pathname);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % IMAGES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`dynamic-bg-container ${isAuthPage ? "dynamic-bg-auth" : "dynamic-bg-interior"}`} aria-hidden="true">
      {IMAGES.map((imgUrl, idx) => (
        <div
          key={imgUrl}
          className={`dynamic-bg-slide ${idx === currentIdx ? "slide-active" : ""}`}
          style={{ backgroundImage: `url(${imgUrl})` }}
        />
      ))}
      <div className="dynamic-bg-overlay" />
    </div>
  );
}
