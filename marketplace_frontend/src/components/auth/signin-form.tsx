"use client";

import { useGoogleSignIn, useSignIn } from "@/hooks/use-auth";
import { SignInDto } from "@/types/api.types";
import { useSearchParams } from "next/navigation";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
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
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? undefined;

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

  const onSubmit = async (data: SignInFormValues) => {
    await signInMutation.mutateAsync(data);
  };

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
