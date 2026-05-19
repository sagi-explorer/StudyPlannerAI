import { useEffect, useRef } from 'react';
import { Button } from 'antd';
import type { Goal } from '@/types';
import styles from './ConfettiAnimation.module.css';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

const COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'];

function createParticles(width: number, height: number, count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * height * 0.5,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    size: Math.random() * 8 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    opacity: 1,
  }));
}

interface ConfettiAnimationProps {
  goal: Goal;
  onClose: () => void;
}

export function ConfettiAnimation({ goal, onClose }: ConfettiAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    particlesRef.current = createParticles(canvas.width, canvas.height, 120);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.vy += 0.05;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (p.y > canvas.height + 20) {
          p.opacity -= 0.02;
        }

        if (p.opacity <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      const alive = particlesRef.current.some((p) => p.opacity > 0);
      if (alive) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.emoji}>🎉</div>
        <div className={styles.title}>月目标达成！</div>
        <div className={styles.goalName}>{goal.title}</div>
        <div className={styles.message}>
          太棒了！你成功完成了这个月目标。每一步积累都在推动你走向终极目标，继续加油！
        </div>
        <Button type="primary" size="large" onClick={onClose}>
          继续前进
        </Button>
      </div>
    </div>
  );
}
