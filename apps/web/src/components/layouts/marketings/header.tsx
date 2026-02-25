"use client";

import { Button } from "@/components/ui/button";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "Platform", href: "/coming-soon" },
  { label: "Solutions", href: "/coming-soon" },
  { label: "Company", href: "/coming-soon" },
];

const MarketingHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  useEffect(() => {
    const handleScroll = () => {
      const footer = document.querySelector("footer");
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        // Hide header when footer is about to enter viewport (100px before)
        setIsHidden(footerRect.top <= window.innerHeight + 100);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      className="fixed top-0 right-0 left-0 z-50 w-full"
      initial={{ y: -20, opacity: 0 }}
      animate={{
        y: isHidden ? -20 : 0,
        opacity: isHidden ? 0 : 1,
      }}
      transition={{
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-b-3xl backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isScrolled ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
      <div className="container relative mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/">
          <Image src="/images/logo/full.svg" alt="Klayim" width={120} height={32} />
        </Link>

        {/* Navigation + Actions */}
        <div className="flex items-center gap-8">
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.label}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <Link
                  href={link.href}
                  className="text-foreground hover:text-primary-yellow text-sm font-medium transition-colors"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Actions */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Button asChild variant="secondary" className="px-6">
              <Link href="/coming-soon">Sign Up</Link>
            </Button>
            <Button asChild className="px-6">
              <Link href="/coming-soon">Get Started</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};

export default MarketingHeader;
