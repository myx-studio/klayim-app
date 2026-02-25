import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { label: "How it Works", href: "/how-it-works" },
      { label: "Features", href: "/features" },
      { label: "Time ROI", href: "/time-roi" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  solutions: {
    title: "Solutions",
    links: [
      { label: "For Individuals", href: "/solutions/individuals" },
      { label: "For Teams", href: "/solutions/teams" },
      { label: "For Organizations", href: "/solutions/organizations" },
      { label: "Enterprise", href: "/enterprise" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { label: "Why Klayim", href: "/why-klayim" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Security & Privacy", href: "/security-privacy" },
    ],
  },
};

const MarketingFooter = () => {
  return (
    <footer className="bg-secondary-accent/50 relative mt-10 h-screen w-full overflow-hidden rounded-t-3xl md:mt-20">
      <div className="container mx-auto px-6 py-12 md:py-16">
        {/* Top Section */}
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          {/* Logo */}
          <div className="flex items-start">
            <Link href="/">
              <Image src="/images/logo/full.svg" alt="Klayim" width={120} height={32} />
            </Link>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 md:gap-16">
            {Object.values(footerLinks).map((section) => (
              <div key={section.title} className="flex flex-col gap-4">
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
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-16 md:mt-24">
          <p className="text-muted-foreground text-sm">© 2026 Klayim, Inc.</p>
        </div>
      </div>

      {/* Footer SVG Background */}
      <div className="pointer-events-none container mx-auto w-full px-6">
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
