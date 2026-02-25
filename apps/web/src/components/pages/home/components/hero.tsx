import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

const Hero = () => {
  return (
    <section
      className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-b-3xl md:min-h-screen"
      style={{
        background: "url('/images/bg-particle.png') repeat",
      }}
    >
      {/* small gradient primarry yellow background */}
      <div className="from-primary-yellow absolute bottom-0 -z-10 h-1/4 w-full rounded-b-3xl bg-gradient-to-t to-transparent opacity-50" />
      {/* Hero Typograph */}
      <div className="container mx-auto my-6 mt-16 flex max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center md:mt-0 md:mt-20 md:gap-6">
        <h1 className="text-3xl font-semibold md:text-4xl md:leading-14 lg:text-5xl">
          Track the ROI of
          <br />
          Your Meetings and Tasks
        </h1>
        <p className="text-base font-light md:text-xl">
          Klayim is the organizational time governance platform that measures cost and ROI of
          meetings and tasks to identify waste and reclaim productivity
        </p>
        <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row md:gap-6">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="#">Get Started</Link>
          </Button>
          <Button asChild size="lg" className="w-full sm:w-auto" variant={"secondary"}>
            <Link href="#">Watch Demo</Link>
          </Button>
        </div>
      </div>
      {/* Hero Image */}
      <div className="container mt-auto px-6">
        <Image
          src="/images/overview-app.png"
          alt="Hero Image"
          width={1200}
          height={800}
          className="mx-auto w-full max-w-4xl object-contain"
        />
      </div>
    </section>
  );
};

export default Hero;
