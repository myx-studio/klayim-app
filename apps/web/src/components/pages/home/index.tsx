import GetStarted from "./components/get-started";
import Hero from "./components/hero";
import HowItWorks from "./components/how-it-works";
import Pricing from "./components/pricing";

const HomePage = () => {
  return (
    <div className="flex w-full flex-col items-start justify-start">
      <Hero />
      <HowItWorks />
      <Pricing />
      <GetStarted />
    </div>
  );
};

export default HomePage;
