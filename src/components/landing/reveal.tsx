"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delay = 0,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={cn(className)}
      initial={false}
      whileInView={
        reducedMotion ? undefined : { y: [18, 0], opacity: [0.6, 1] }
      }
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={
        hover && !reducedMotion
          ? { y: -5, transition: { duration: 0.3 } }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
