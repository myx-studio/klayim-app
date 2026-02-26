import { Suspense } from "react";
import VerifyEmailPage from "@/components/pages/auth/verify-email";

const Page = () => {
  return (
    <Suspense>
      <VerifyEmailPage />
    </Suspense>
  );
};

export default Page;
