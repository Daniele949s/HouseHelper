import React, { useState, useRef, useEffect } from "react";

export default function InteractiveMascot({ targetInputRef, isError, errorMessage }) {
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [mascotX, setMascotX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startMascotX: 0 });
  const chloeRef = useRef(null);

  // Eye tracking logic
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!chloeRef.current) return;
      const rect = chloeRef.current.getBoundingClientRect();
      const faceCenterX = rect.left + rect.width / 2;
      const faceCenterY = rect.top + 80;

      let targetX = e.clientX;
      let targetY = e.clientY;

      if (targetInputRef && targetInputRef.current === document.activeElement) {
        const inputRect = targetInputRef.current.getBoundingClientRect();
        targetX = inputRect.left + (inputRect.width / 2);
        targetY = inputRect.top + (inputRect.height / 2);
      }

      const dx = targetX - faceCenterX;
      const dy = targetY - faceCenterY;
      const dist = Math.hypot(dx, dy) || 1;
      const maxDistance = 14;
      const factor = Math.min(1, dist / 250);

      setPupilOffset({
        x: (dx / dist) * maxDistance * factor,
        y: (dy / dist) * maxDistance * factor
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [targetInputRef]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startMascotX: mascotX
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const newX = dragStartRef.current.startMascotX + dx;
    // Bound the drag horizontally
    const clampedX = Math.max(-120, Math.min(120, newX));
    setMascotX(clampedX);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    // Smooth spring back to center
    setMascotX(0);
  };

  return (
    <div className="mascot-widget-wrapper" aria-hidden="true">
      <div
        ref={chloeRef}
        className={`chloe-character ${isDragging ? "dragging" : ""} ${isError ? "has-error" : ""}`}
        style={{
          transform: `translateX(${mascotX}px) scale(0.75)`,
          transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Curved error text arc */}
        {isError && (
          <div className="mascot-error-bubble">
            <span>{errorMessage || "Attenzione ai campi!"}</span>
          </div>
        )}

        {/* Eye whites */}
        <div className="mascot-eye-whites">
          <svg width="118" height="57" viewBox="0 0 118 57" fill="none">
            <ellipse cx="99" cy="28" fill="#fff" rx="19" ry="28" />
            <ellipse cx="19" cy="28" fill="#fff" rx="19" ry="28" />
          </svg>
        </div>

        {/* Eyeballs moving with cursor */}
        <div
          className="mascot-eyeball eyeball-left"
          style={{
            transform: `translate(calc(-50% - 40px + ${pupilOffset.x}px), calc(-50% + ${pupilOffset.y}px))`
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="url(#pupil-grad)" />
            <circle cx="23" cy="12" r="5" fill="#fff" />
            <circle cx="25" cy="21" r="2.5" fill="#fff" />
            <defs>
              <linearGradient id="pupil-grad" x1="0" x2="35" y1="17.5" y2="17.5" gradientUnits="userSpaceOnUse">
                <stop offset=".3" stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div
          className="mascot-eyeball eyeball-right"
          style={{
            transform: `translate(calc(-50% + 40px + ${pupilOffset.x}px), calc(-50% + ${pupilOffset.y}px))`
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="url(#pupil-grad-r)" />
            <circle cx="23" cy="12" r="5" fill="#fff" />
            <circle cx="25" cy="21" r="2.5" fill="#fff" />
            <defs>
              <linearGradient id="pupil-grad-r" x1="0" x2="35" y1="17.5" y2="17.5" gradientUnits="userSpaceOnUse">
                <stop offset=".3" stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Mascot Face & Body SVG */}
        <div className="mascot-face-mask">
          <svg width="232" height="172" viewBox="0 0 232 172" fill="none">
            <defs>
              <linearGradient id="face-grad" x1="118" x2="118" y1="0" y2="168" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a78bfa" />
                <stop offset=".3" stopColor="#818cf8" />
                <stop offset=".7" stopColor="#6366f1" />
                <stop offset="1" stopColor="#4338ca" />
              </linearGradient>
            </defs>
            <path fill="url(#face-grad)" d="M115.972 0c18.723 0 36.111 5.717 50.512 15.501 8.836-12.564 25.962-16.522 39.52-8.694 14.349 8.284 19.264 26.631 10.98 40.98A29.875 29.875 0 0 1 201.197 61c3.096 9.1 4.775 18.853 4.775 29 0 49.706-40.294 78-90 78-49.705 0-90-28.294-90-78 0-11.353 2.103-22.215 5.939-32.218a29.86 29.86 0 0 1-12.888-11.994c-8.284-14.349-3.368-32.696 10.98-40.98 13.405-7.74 30.3-3.958 39.219 8.272C82.847 4.78 98.852 0 115.972 0ZM75.023 82.807c-10.493 0-19 12.536-19 28s8.507 28 19 28c10.494 0 19-12.536 19-28s-8.506-28-19-28Zm80 0c-10.493 0-19 12.536-19 28s8.507 28 19 28c10.494 0 19-12.536 19-28s-8.506-28-19-28Z"/>
            <path fill="#ede9fe" d="M115.023 43.807c40.87 0 74 29.001 74 64.776 0 35.775-33.131 55.224-74 55.224s-74-19.449-74-55.224c0-35.775 33.131-64.776 74-64.776Zm-40 39c-10.493 0-19 12.536-19 28s8.507 28 19 28c10.494 0 19-12.536 19-28s-8.506-28-19-28Zm80 0c-10.493 0-19 12.536-19 28s8.507 28 19 28c10.494 0 19-12.536 19-28s-8.506-28-19-28Z"/>
            <path fill="#4f46e5" d="M75.504 75.077c-2.605-.046-8.154 1.337-12.012 3.029-.954.418-.556 1.312.467 1.114 12.928-2.505 20.976 1.09 20.976 1.09.985.357 1.706-.947.879-1.591l-.349-.271c-2.507-2.534-6.355-3.308-9.962-3.371ZM151.051 75.077c2.605-.046 8.153 1.337 12.012 3.029.954.418.556 1.312-.467 1.114-12.928-2.505-20.976 1.09-20.976 1.09-.985.357-1.706-.947-.879-1.591l.348-.271c2.507-2.534 6.355-3.308 9.962-3.371Z"/>
            <ellipse cx="155.023" cy="110.807" stroke="#4f46e5" strokeWidth="2" rx="19" ry="28"/>
            <ellipse cx="75.023" cy="110.807" stroke="#4f46e5" strokeWidth="2" rx="19" ry="28"/>
            <path className="nose" fill="#4f46e5" d="M118 121.5c1.644 0 3.036.174 4.005.697.473.256.839.591 1.09 1.029.251.439.405 1.014.405 1.774 0 .663-.296 1.333-.804 1.991-.506.657-1.196 1.265-1.912 1.79a4.696 4.696 0 0 1-5.568 0c-.716-.525-1.406-1.133-1.912-1.79-.508-.658-.804-1.328-.804-1.991 0-.76.154-1.335.405-1.774.251-.438.617-.773 1.09-1.029.969-.523 2.361-.697 4.005-.697Z"/>
            {isError ? (
              <ellipse cx="118" cy="144" rx="7" ry="11" fill="#4f46e5" />
            ) : (
              <path className="mouth" stroke="#4f46e5" strokeLinecap="round" strokeWidth="2.5" d="M130.283 141.002c-3.315 2.561-7.811 4-12.5 4-4.688 0-9.185-1.439-12.5-4M132.863 141.968l-.879-.424a5.134 5.134 0 0 1-2.467-2.543M103 142.299l.831-.513A5.137 5.137 0 0 0 106.02 139"/>
            )}
            <path className="arms" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="2" d="M17.105 139h24.98l5.031 5.031a53.938 53.938 0 0 0 6.972 5.881l5.77 4.088H31.532v2.169c0 6.817-2.99 12.999-9.164 14.242-1.919.387-3.769.589-5.262.589C8.204 171 1 163.831 1 155c0-8.693 6.981-15.776 15.69-15.995l.415-.005ZM214.895 139h-24.981l-5.03 5.031a53.988 53.988 0 0 1-6.972 5.881l-5.77 4.088h28.326v2.169c0 6.817 2.99 12.999 9.164 14.242 1.919.387 3.769.589 5.263.589 8.9 0 16.105-7.169 16.105-16 0-8.693-6.981-15.776-15.689-15.995l-.416-.005Z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
