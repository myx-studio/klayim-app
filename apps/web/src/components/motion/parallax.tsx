"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import type { ReactNode } from "react";
import { useRef } from "react";

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  speed?: number; // negative = slower, positive = faster
  direction?: "vertical" | "horizontal";
}

const Parallax = ({
  children,
  className,
  speed = 0.5,
  direction = "vertical",
}: ParallaxProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [speed * -100, speed * 100]);
  const x = useTransform(scrollYProgress, [0, 1], [speed * -100, speed * 100]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={direction === "vertical" ? { y } : { x }}
    >
      {children}
    </motion.div>
  );
};

export default Parallax;
