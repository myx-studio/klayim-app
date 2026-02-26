import { Suspense } from "react";
import ResetPasswordPage from "@/components/pages/auth/reset-password";

const Page = () => {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  );
};

export default Page;
