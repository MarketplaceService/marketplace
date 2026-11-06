"use client";

import {
  useCurrentUser,
  useGoogleSignIn,
  useResendVerificationEmail,
  useSignIn,
} from "@/hooks/use-auth";
import { SignInDto } from "@/types/api.types";
import { useRouter, useSearchParams } from "next/navigation";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "../ui/field";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import Image from "next/image";
import { SocialAuthButtons } from "./social-auth-buttons";


export function SignInForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? undefined;
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    if (currentUser) {
      router.replace(redirectTo || "/product/catalog");
    }
  }, [currentUser, redirectTo, router]);

  const signInMutation = useSignIn(
    {
      success: "Đăng nhập thành công",
      error: "Đăng nhập thất bại",
    },
    redirectTo,
  );

  type SignInFormValues = SignInDto & { rememberMe: boolean };

  const { signInWithGoogle, isLoading: isGoogleLoading } = useGoogleSignIn({
    error: "Không thể khởi tạo đăng nhập Google",
  });

  const signInSchema = useMemo(
    () =>
      z.object({
        email: z.email("Email không hợp lê"),
        password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
        rememberMe: z.boolean(),
      }),
    [],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const { mutate: resendEmail, isPending: isResending } =
    useResendVerificationEmail({
      success: 'Đã gửi lại email xác thực! Vui lòng kiểm tra hộp thư của bạn.',
      error: 'Gửi lại email xác thực thất bại. Vui lòng thử lại sau.',
    });

  const onSubmit = async (data: SignInFormValues) => {
    try {
      await signInMutation.mutateAsync(data);
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || '';
      const errCode = (err as { code?: string })?.code || '';
      if (
        errCode === 'EMAIL_NOT_VERIFIED' ||
        errMsg.toLowerCase().includes('xác thực') ||
        errMsg.toLowerCase().includes('verified')
      ) {
        setUnverifiedEmail(data.email);
      }
    }
  };

  if (currentUser) {
    return (
      <div className="bg-card rounded-2xl p-8 text-center border border-border shadow-sm max-w-md mx-auto">
        <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-foreground">
          Bạn đã đăng nhập với tài khoản{' '}
          <span className="text-primary font-bold">{currentUser.name || currentUser.email}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          Đang chuyển hướng về trang chủ...
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-6 md:p-8"
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Chào mừng trở lại</h1>
                <p className="text-muted-foreground text-balance">
                  Đăng nhập vào tài khoản Shytech
                </p>
              </div>

              {unverifiedEmail && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 text-xs animate-in fade-in duration-200">
                  <p className="font-bold mb-1 flex items-center gap-1.5 text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Tài khoản chưa được xác thực email</span>
                  </p>
                  <p className="mb-2.5 leading-relaxed text-amber-800/90">
                    Hệ thống đã gửi liên kết kích hoạt đến{' '}
                    <strong className="font-mono text-amber-950 font-semibold">{unverifiedEmail}</strong>.
                    Vui lòng kiểm tra hộp thư (kể cả mục Spam) để kích hoạt trước khi đăng nhập.
                  </p>
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={() => resendEmail(unverifiedEmail)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition cursor-pointer disabled:opacity-50 text-xs inline-flex items-center gap-1"
                  >
                    <span>{isResending ? 'Đang gửi...' : 'Gửi lại email xác thực'}</span>
                  </button>
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@gmail.com"
                  {...register("email")}
                  disabled={signInMutation.isPending}
                />
                {errors.email && (
                  <FieldError className="text-destructive">
                    {errors.email.message}
                  </FieldError>
                )}
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                  <a
                    href="/auth/forgot-password"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Quên mật khẩu
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  disabled={signInMutation.isPending}
                />
                {errors.password && (
                  <FieldError className="text-destructive">
                    {errors.password.message}
                  </FieldError>
                )}
              </Field>
              <Field>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={watch("rememberMe")}
                    onCheckedChange={(v) => setValue("rememberMe", v === true)}
                    disabled={signInMutation.isPending}
                  />
                  Ghi nhớ đăng nhập
                </label>
              </Field>

              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={signInMutation.isPending}
                >
                  {signInMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
              </Field>

              <FieldSeparator>hoặc</FieldSeparator>
              <SocialAuthButtons
                onGoogleSignIn={signInWithGoogle}
                isGoogleLoading={isGoogleLoading}
              />

              <FieldDescription className="text-center">
                Chưa có tài khoản?{" "}
                <a
                  href="/auth/signup"
                  className="font-medium text-primary hover: underline"
                >
                  Đăng ký
                </a>
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="bg-muted relative hidden md:block">
            <Image
              src="/login-thumbnail.jpg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
              fill
              priority
              sizes="(max-width: 768px) 0px, 50vw"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
