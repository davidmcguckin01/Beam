"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
}

function hexToRgb(hex: string): number[] {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

const Particles: React.FC<ParticlesProps> = ({
  className,
  quantity = 30,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = "#ffffff",
  vx = 0,
  vy = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const circles = useRef<any[]>([]);
  const animationFrame = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (canvasRef.current) {
      context.current = canvasRef.current.getContext("2d");
    }
    initCanvas();
    animate();
    window.addEventListener("resize", initCanvas);

    return () => {
      window.removeEventListener("resize", initCanvas);
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [color, quantity, staticity, ease, size]);

  useEffect(() => {
    initCanvas();
  }, [refresh]);

  const initCanvas = () => {
    resizeCanvas();
    drawParticles();
  };

  const resizeCanvas = () => {
    if (canvasContainerRef.current && canvasRef.current && context.current) {
      circles.current = [];
      const { width, height } = canvasContainerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
      context.current.scale(dpr, dpr);
      setDimensions({ w: width, h: height });
    }
  };

  const circleParams = (): any => {
    const x = Math.floor(Math.random() * dimensions.w);
    const y = Math.floor(Math.random() * dimensions.h);
    const translateX = 0;
    const translateY = 0;
    const p = Math.random() * (Math.PI * 2);
    const t = Math.random() * (Math.PI * 2);
    const v = Math.random() * 0.5;
    const w = Math.random() * 0.5;
    return {
      x,
      y,
      translateX,
      translateY,
      size: Math.random() * size,
      alpha: 0,
      sinAlpha: 0,
      t,
      v,
      w,
      p,
    };
  };

  const drawCircle = (circle: any, update = false) => {
    if (context.current) {
      const { x, y, translateX, translateY, size, alpha, sinAlpha } = circle;
      context.current.translate(translateX, translateY);
      context.current.beginPath();
      context.current.arc(x, y, size, 0, 2 * Math.PI);
      context.current.fillStyle = `rgba(${hexToRgb(color).join(", ")}, ${sinAlpha})`;
      context.current.fill();
      context.current.setTransform(1, 0, 0, 1, 0, 0);

      if (!update) {
        circles.current.push(circle);
      }
    }
  };

  const drawParticles = () => {
    clearContext();
    const particleCount = quantity;
    for (let i = 0; i < particleCount; i++) {
      const circle = circleParams();
      drawCircle(circle);
    }
  };

  const remapValue = (
    value: number,
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): number => {
    const remapped =
      ((value - start1) / (end1 - start1)) * (end2 - start2) + start2;
    return remapped > 0 ? remapped : 0;
  };

  const animate = () => {
    clearContext();
    circles.current.forEach((circle: any, i: number) => {
      // Handle alpha value
      const edge = [
        circle.x + circle.size,
        dimensions.w - circle.x - circle.size,
        circle.y + circle.size,
        dimensions.h - circle.y - circle.size,
      ];
      const closestEdge = edge.reduce((a, b) => Math.min(a, b));
      const remapClosestEdge = remapValue(
        closestEdge,
        0,
        20,
        0,
        staticity
      );
      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.sinAlpha) {
          circle.sinAlpha = circle.alpha;
        }
      } else {
        circle.alpha = circle.sinAlpha * remapClosestEdge;
      }
      circle.sinAlpha -= 0.01;

      // Handle movement
      circle.x += circle.vx + vx;
      circle.y += circle.vy + vy;
      circle.translateX +=
        (Math.random() - 0.5) * 2 - circle.translateX * ease * 0.01;
      circle.translateY +=
        (Math.random() - 0.5) * 2 - circle.translateY * ease * 0.01;

      // Reset if out of bounds
      if (
        circle.x < -circle.size ||
        circle.x > dimensions.w + circle.size ||
        circle.y < -circle.size ||
        circle.y > dimensions.h + circle.size
      ) {
        circles.current[i] = circleParams();
      }

      drawCircle(circle, true);
    });
    animationFrame.current = requestAnimationFrame(animate);
  };

  const clearContext = () => {
    if (context.current) {
      context.current.clearRect(0, 0, dimensions.w, dimensions.h);
    }
  };

  return (
    <div className={cn("pointer-events-none", className)} ref={canvasContainerRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Particles;

