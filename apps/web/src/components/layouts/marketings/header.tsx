import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

const navLinks = [
  { label: "Platform", href: "/platform" },
  { label: "Solutions", href: "/solutions" },
  { label: "Company", href: "/company" },
];

const MarketingHeader = () => {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 w-full">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/">
          <Image src="/images/logo/full.svg" alt="Klayim" width={120} height={32} />
        </Link>

        {/* Navigation + Actions */}
        <div className="flex items-center gap-8">
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-foreground hover:text-primary-yellow text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button asChild variant="secondary" className="px-6">
              <Link href="/signup">Sign Up</Link>
            </Button>
            <Button asChild className="px-6">
              <Link href="/get-started">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MarketingHeader;
