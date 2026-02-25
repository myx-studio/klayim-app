import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

const GetStarted = () => {
  return (
    <section className="relative flex w-full flex-col items-center justify-center py-10 md:py-16">
      <div className="container px-6">
        <div
          className="bg-secondary-accent flex w-full flex-col overflow-hidden rounded-3xl lg:flex-row"
          style={{
            background: "var(--color-secondary-accent) url('/images/bg-particle.png') repeat",
          }}
        >
          {/* Left Content */}
          <div className="flex flex-1 flex-col justify-center gap-6 p-8 md:gap-8 md:p-12 lg:p-16">
            <h2 className="text-3xl font-semibold md:text-4xl md:leading-tight lg:text-5xl lg:leading-tight">
              Start Track
              <br />
              the ROI of Your Meetings
              <br />
              and Tasks
            </h2>
            <p className="text-muted-foreground max-w-xl text-base font-light md:text-lg">
              Klayim is the organizational time governance platform that measures cost and ROI of
              meetings and tasks to identify waste and reclaim productivity
            </p>
            <div>
              <Button asChild size="lg" className="px-8 py-6 text-base">
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>

          {/* Right Content - Dashboard Preview Image */}
          <div className="relative flex flex-1 items-end justify-end overflow-hidden">
            <Image
              src="/images/get-started.png"
              alt="Klayim Dashboard Preview"
              width={600}
              height={500}
              className="object-contain object-bottom-right"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default GetStarted;
