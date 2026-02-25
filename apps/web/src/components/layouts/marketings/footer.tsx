"use client";

import { FadeIn } from "@/components/motion";
import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { label: "How it Works", href: "/coming-soon" },
      { label: "Features", href: "/coming-soon" },
      { label: "Time ROI", href: "/coming-soon" },
      { label: "Pricing", href: "/coming-soon" },
    ],
  },
  solutions: {
    title: "Solutions",
    links: [
      { label: "For Individuals", href: "/coming-soon" },
      { label: "For Teams", href: "/coming-soon" },
      { label: "For Organizations", href: "/coming-soon" },
      { label: "Enterprise", href: "/coming-soon" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { label: "Why Klayim", href: "/coming-soon" },
      { label: "About", href: "/coming-soon" },
      { label: "Contact", href: "/coming-soon" },
      { label: "Security & Privacy", href: "/coming-soon" },
    ],
  },
};

const MarketingFooter = () => {
  return (
    <footer
      className="bg-secondary-accent/50 relative mt-10 w-full overflow-hidden rounded-t-3xl pt-16"
      style={{
        background:
          "color-mix(in srgb, var(--color-secondary-accent) 20%, transparent) url('/images/bg-particle.png') repeat",
      }}
    >
      <div className="container mx-auto h-full px-6">
        {/* Top Section */}
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          {/* Logo */}
          <FadeIn direction="right">
            <div className="flex items-start">
              <Link href="/">
                <Image src="/images/logo/full.svg" alt="Klayim" width={120} height={32} />
              </Link>
            </div>
          </FadeIn>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 md:gap-16">
            {Object.values(footerLinks).map((section, sectionIndex) => (
              <FadeIn key={section.title} delay={0.1 * sectionIndex} direction="up">
                <div className="flex flex-col gap-4">
                  <h4 className="text-muted-foreground text-sm">{section.title}</h4>
                  <ul className="flex flex-col gap-2">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="hover:text-primary-yellow text-sm font-bold transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <FadeIn delay={0.4}>
          <div className="mt-16 md:mt-24">
            <p className="text-muted-foreground text-sm">© 2026 Klayim, Inc.</p>
          </div>
        </FadeIn>
      </div>

      {/* Footer SVG Background */}
      <div className="pointer-events-none inset-x-0 bottom-0 container mx-auto mt-16 w-full px-6">
        <Image
          src="/images/footer.svg"
          alt=""
          width={1321}
          height={434}
          className="h-auto w-full"
        />
      </div>
    </footer>
  );
};

export default MarketingFooter;
