import { useState, useEffect, useRef } from 'react';

const TITLE = 'MEMORY PALACE';

export default function LandingPage({ onEnter }) {
  const [exiting, setExiting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      r: Math.random() * 1.5 + 0.5,
      hue: Math.random() > 0.5 ? 170 : 270,
    }));

    const draw = () => {
      t += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        const px = p.x * canvas.width;
        const py = p.y * canvas.height;
        const alpha = 0.15 + Math.sin(t + p.x * 10) * 0.1;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${alpha})`;
        ctx.fill();
      });

      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach((b) => {
          const dx = (a.x - b.x) * canvas.width;
          const dy = (a.y - b.y) * canvas.height;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
            ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
            ctx.strokeStyle = `rgba(0, 245, 212, ${0.04 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      frame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleEnter = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onEnter, 700);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') handleEnter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exiting]);

  return (
    <div className={`landing ${exiting ? 'landing--exiting' : ''}`}>
      <canvas ref={canvasRef} className="landing__canvas" />

      <div className="landing__content">
        <div className="landing__label">Method of Loci</div>

        <h1 className="landing__title">
          {TITLE.split('').map((char, i) => (
            <span
              key={i}
              className="landing__char"
              style={{
                animationDelay: `${0.3 + i * 0.05}s`,
                opacity: revealed ? undefined : 0,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </h1>

        <div className="landing__line" />

        <p className="landing__description">
          Build spatial memory in an infinite void.
          <br />
          Place thoughts. Walk corridors. Remember everything.
        </p>

        <button
          id="enter-palace-btn"
          className="landing__enter"
          onClick={handleEnter}
          disabled={exiting}
        >
          <span className="landing__enter-text">Begin</span>
          <span className="landing__enter-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
