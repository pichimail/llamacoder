"use client";

import { useEffect, useRef } from "react";

type Particle = {
  angle: number;
  distance: number;
  speed: number;
  length: number;
  thickness: number;
  hue: number;
  alpha: number;
};

const PARTICLE_COUNT = 180;

export default function HyperspeedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let centerX = 0;
    let centerY = 0;
    let particles: Particle[] = [];

    const createParticle = (): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 14;
      const length = 80 + Math.random() * 220;
      const thickness = 0.8 + Math.random() * 1.8;
      const hue = 190 + Math.random() * 70;
      return {
        angle,
        distance: Math.random() * Math.max(width, height) * 0.45,
        speed,
        length,
        thickness,
        hue,
        alpha: 0.35 + Math.random() * 0.45,
      };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      centerX = width / 2;
      centerY = height * 0.58;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
    };

    const render = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(2, 6, 23, 0.45)";
      context.fillRect(0, 0, width, height);

      const glow = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.max(width, height) * 0.75,
      );
      glow.addColorStop(0, "rgba(37, 99, 235, 0.18)");
      glow.addColorStop(0.28, "rgba(59, 130, 246, 0.08)");
      glow.addColorStop(0.62, "rgba(14, 165, 233, 0.04)");
      glow.addColorStop(1, "rgba(2, 6, 23, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalCompositeOperation = "lighter";
      context.lineCap = "round";

      for (const particle of particles) {
        const previousDistance = particle.distance;
        particle.distance += particle.speed;

        const maxDistance = Math.hypot(width, height) * 0.9;
        if (particle.distance > maxDistance) {
          particle.angle = Math.random() * Math.PI * 2;
          particle.distance = 0;
          particle.speed = 4 + Math.random() * 14;
          particle.length = 80 + Math.random() * 220;
          particle.thickness = 0.8 + Math.random() * 1.8;
          particle.hue = 190 + Math.random() * 70;
          particle.alpha = 0.35 + Math.random() * 0.45;
        }

        const startX = centerX + Math.cos(particle.angle) * previousDistance;
        const startY = centerY + Math.sin(particle.angle) * previousDistance;
        const endX = centerX + Math.cos(particle.angle) * particle.distance;
        const endY = centerY + Math.sin(particle.angle) * particle.distance;
        const trailX =
          centerX +
          Math.cos(particle.angle) * Math.max(particle.distance - particle.length, 0);
        const trailY =
          centerY +
          Math.sin(particle.angle) * Math.max(particle.distance - particle.length, 0);

        const stroke = context.createLinearGradient(startX, startY, endX, endY);
        stroke.addColorStop(0, `hsla(${particle.hue}, 100%, 70%, 0)`);
        stroke.addColorStop(0.2, `hsla(${particle.hue}, 100%, 70%, ${particle.alpha * 0.45})`);
        stroke.addColorStop(1, `hsla(${particle.hue}, 100%, 75%, ${particle.alpha})`);

        context.beginPath();
        context.lineWidth = particle.thickness;
        context.strokeStyle = stroke;
        context.moveTo(trailX, trailY);
        context.lineTo(endX, endY);
        context.stroke();

        context.fillStyle = `hsla(${particle.hue}, 100%, 80%, ${particle.alpha})`;
        context.beginPath();
        context.arc(endX, endY, particle.thickness * 0.75, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();
      animationFrame = window.requestAnimationFrame(render);
    };

    resize();
    render();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-slate-950"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full opacity-90 mix-blend-screen"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18)_0%,rgba(2,6,23,0)_45%,rgba(2,6,23,0.75)_100%)]" />
    </div>
  );
}
