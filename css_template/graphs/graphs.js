		// ===== Mobile-friendly SVG morph animation (easeInOutSine version - smooth, organic) =====

// Easing functions
const Easings = {
    // 🎯 Natural & gentle: slow start, fast middle, smooth landing
    easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2
  };
  
  const DURATION = 360; // slightly longer for softer rhythm
  
  // ----- Path interpolator -----
  function makePathInterpolator(d0, d1, easingFn = Easings.easeInOutSine) {
    const token = s =>
      Array.from(
        s.matchAll(
          /([AaCcHhLlMmQqSsTtVvZz])|([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/g
        )
      ).map(m =>
        m[1] ? { t: "cmd", v: m[1] } : { t: "num", v: parseFloat(m[2]) }
      );
  
    const a = token(d0),
      b = token(d1);
    if (a.length !== b.length) return null;
    for (let i = 0; i < a.length; i++) {
      if (a[i].t !== b[i].t || (a[i].t === "cmd" && a[i].v !== b[i].v)) return null;
    }
  
    const plan = a.map((it, i) =>
      it.t === "cmd" ? it.v : { from: it.v, to: b[i].v }
    );
    const ease = easingFn;
  
    return t => {
      const e = ease(t);
      let out = "";
      for (const item of plan) {
        if (typeof item === "string") {
          if (out && out[out.length - 1] !== " ") out += " ";
          out += item;
        } else {
          const v = item.from + (item.to - item.from) * e;
          out += (out ? " " : "") + v;
        }
      }
      return out;
    };
  }
  
  // ----- Morph animation -----
  function morphPath(pathEl, targetD, duration = DURATION) {
    const startD = pathEl.getAttribute("d");
    if (!targetD || startD === targetD) return;
    const interp = makePathInterpolator(startD, targetD, Easings.easeInOutSine);
    if (!interp) {
      pathEl.setAttribute("d", targetD);
      return;
    }
  
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      pathEl.setAttribute("d", interp(t));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  
  // ----- Interaction handling -----
  const svg = document.querySelector(".skill-info");
  const buttons = document.querySelectorAll(".btn");
  
  buttons.forEach(btn => {
    const view = btn.classList.contains("today")
      ? "today"
      : btn.classList.contains("tomorrow")
      ? "tomorrow"
      : "yesterday";
  
    btn.addEventListener("click", () => setView(view));
    btn.addEventListener("pointerdown", e => {
      if (e.pointerType !== "mouse") {
        e.preventDefault();
        setView(view);
      }
    });
  });
  
  function setView(view) {
    buttons.forEach(b => b.classList.remove("active"));
    svg.classList.remove(
      "yesterday",
      "today",
      "tomorrow",
      "active-animation",
      "active-fill-animation"
    );
    svg.classList.add(view);
  
    const activeBtn = document.querySelector(".btn." + view);
    activeBtn.classList.add("active");
  
    if (view === "today") svg.classList.add("active-animation");
    if (view === "tomorrow")
      svg.classList.add("active-animation", "active-fill-animation");
  
    svg.querySelectorAll("path").forEach(p => {
      const target = p.dataset[view];
      if (target) morphPath(p, target, DURATION);
    });
  }
  