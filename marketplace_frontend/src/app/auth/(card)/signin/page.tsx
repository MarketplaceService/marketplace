import { SignInForm } from "@/components/auth/signin-form";
import { Suspense } from "react";

const SignInPage = () => {
  return (
    <div className="w-full max-w-sm md:max-w-4xl">
      <Suspense
        fallback={
          <div className="bg-card rounded-lg p-6 md:p-8 text-center">
            <p className="text-muted-foreground">Đang tải...</p>
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </div>
  );
};

export default SignInPage;
