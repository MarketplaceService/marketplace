import { SignInForm } from "@/components/auth/signin-form";
import { Suspense } from "react";

const SignInPage = () => {
  return (
    <div className="w-full max-w-sm md:max-w-4xl">
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
};

export default SignInPage;
