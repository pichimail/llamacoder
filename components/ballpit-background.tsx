"use client";

import { useEffect, useRef } from "react";

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
};

const BALL_COUNT = 230;
const GRAVITY = 0;
const FRICTION = 0.987;
const WALL_BOUNCE = 0.9;

const COLORS = [
  "rgba(59, 130, 246, 0.16)",
  "rgba(96, 165, 250, 0.18)",
  "rgba(147, 197, 253, 0.14)",
  "rgba(226, 232, 240, 0.22)",
  "rgba(203, 213, 225, 0.18)",
  "rgba(96, 165, 250, 0.12)",
];

export default function BallpitBackground() {
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
    let balls: Ball[] = [];
    let pointer = { x: -9999, y: -9999, active: false };

    const createBall = (): Ball => {
      const radius = 12 + Math.random() * 18;
      return {
        x: radius + Math.random() * Math.max(width - radius * 2, 1),
        y: radius + Math.random() * Math.max(height - radius * 2, 1),
        vx: (Math.random() - 0.5) * 0.85,
        vy: (Math.random() - 0.5) * 0.85,
        radius,
        color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? COLORS[0],
      };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      balls = Array.from({ length: BALL_COUNT }, createBall);
    };

    const drawBackground = () => {
      const gradient = context.createRadialGradient(
        width * 0.5,
        height * 0.4,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.8,
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      gradient.addColorStop(0.55, "rgba(248, 250, 252, 0.9)");
      gradient.addColorStop(1, "rgba(241, 245, 249, 1)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    };

    const update = () => {
      drawBackground();

      context.save();
      context.globalCompositeOperation = "multiply";

      for (const ball of balls) {
        ball.vy += GRAVITY;
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;

        if (pointer.active) {
          const dx = ball.x - pointer.x;
          const dy = ball.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < 180) {
            const force = (1 - distance / 180) * 0.08;
            ball.vx += (dx / distance) * force;
            ball.vy += (dy / distance) * force;
          }
        }

        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx) * WALL_BOUNCE;
        } else if (ball.x + ball.radius > width) {
          ball.x = width - ball.radius;
          ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE;
        }

        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy) * WALL_BOUNCE;
        } else if (ball.y + ball.radius > height) {
          ball.y = height - ball.radius;
          ball.vy = -Math.abs(ball.vy) * WALL_BOUNCE;
        }

        context.beginPath();
        const shadow = context.createRadialGradient(
          ball.x - ball.radius * 0.25,
          ball.y - ball.radius * 0.25,
          ball.radius * 0.2,
          ball.x,
          ball.y,
          ball.radius,
        );
        shadow.addColorStop(0, "rgba(255,255,255,0.95)");
        shadow.addColorStop(0.5, ball.color);
        shadow.addColorStop(1, "rgba(148, 163, 184, 0.12)");
        context.fillStyle = shadow;
        context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();
      animationFrame = window.requestAnimationFrame(update);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY, active: true };
    };

    const onPointerLeave = () => {
      pointer = { x: -9999, y: -9999, active: false };
    };

    resize();
    update();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0.12)_32%,rgba(255,255,255,0)_68%)]" />
    </div>
  );
}
