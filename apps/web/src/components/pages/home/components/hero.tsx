"use client";

import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax transforms - content moves slower
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const imageOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-b-3xl md:min-h-screen"
      style={{
        background: "url('/images/bg-particle.png') repeat",
      }}
    >
      {/* small gradient primary yellow background */}
      <motion.div
        className="from-primary-yellow absolute bottom-0 -z-10 h-1/4 w-full rounded-b-3xl bg-gradient-to-t to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1, delay: 0.5 }}
      />

      {/* Hero Typography with Parallax */}
      <motion.div
        className="container mx-auto my-6 mt-20 flex max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center md:mt-24 md:gap-6"
        style={{ y: contentY, opacity: contentOpacity, scale }}
      >
        <FadeIn delay={0.1}>
          <h1 className="text-3xl font-semibold md:text-4xl md:leading-14 lg:text-5xl">
            Track the ROI of
            <br />
            Your Meetings and Tasks
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-base font-light md:text-xl">
            Klayim is the organizational time governance platform that measures cost and ROI of
            meetings and tasks to identify waste and reclaim productivity
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row md:gap-6">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/coming-soon">Get Started</Link>
            </Button>
            <Button asChild size="lg" className="w-full sm:w-auto" variant={"secondary"}>
              <Link href="/coming-soon">Watch Demo</Link>
            </Button>
          </div>
        </FadeIn>
      </motion.div>

      {/* Hero Image */}
      <motion.div className="container mt-auto px-6" style={{ opacity: imageOpacity }}>
        <FadeIn delay={0.4} direction="up" distance={50}>
          <Image
            src="/images/overview-app.png"
            alt="Hero Image"
            width={1200}
            height={800}
            className="mx-auto w-full max-w-4xl object-contain"
          />
        </FadeIn>
      </motion.div>
    </section>
  );
};

export default Hero;
