"use client";

import { useUpdateProfile } from "@/hooks/use-profile";
import { roleLabel } from "@/lib/user-role";
import { UserProfile } from "@/types/api.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PHONE_PATTERN } from "./address-utils";

const GENDER_OPTIONS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
];

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập họ và tên")
    .max(100, "Họ và tên tối đa 100 ký tự"),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "Số điện thoại không hợp lệ")
    .or(z.literal("")),
  birthday: z.string(),
  gender: z.string(),
  image: z
    .url({ protocol: /^https?$/, error: "URL ảnh không hợp lệ" })
    .or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function toFormValues(profile: UserProfile): ProfileFormValues {
  return {
    name: profile.name,
    phone: profile.phone ?? "",
    birthday: profile.birthday ?? "",
    gender: profile.gender ?? "",
    image: profile.image ?? "",
  };
}

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: toFormValues(profile),
  });

  const imagePreview = useWatch({ control, name: "image" });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate({
      name: data.name,
      phone: data.phone || null,
      birthday: data.birthday || null,
      gender: data.gender || null,
      image: data.image || null,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h3 className="text-lg font-semibold text-foreground">Thông tin cá nhân</h3>
        <p className="text-sm text-muted-foreground">
          Cập nhật hồ sơ tài khoản và thông tin liên hệ của bạn.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <div className="flex flex-col items-start gap-5 border-b border-border pb-6 sm:flex-row sm:items-center">
          <Avatar className="h-16 w-16 border border-border">
            {imagePreview && (
              <AvatarImage
                src={imagePreview}
                alt={profile.name}
              />
            )}
            <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
              {profile.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Field className="flex-1">
            <FieldLabel htmlFor="profile-image">URL ảnh đại diện</FieldLabel>
            <Input
              id="profile-image"
              type="url"
              placeholder="https://..."
              {...register("image")}
            />
            {errors.image && (
              <FieldError className="text-destructive">
                {errors.image.message}
              </FieldError>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="profile-name">
              Họ và tên <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="profile-name"
              {...register("name")}
            />
            {errors.name && (
              <FieldError className="text-destructive">
                {errors.name.message}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="profile-phone">Số điện thoại</FieldLabel>
            <Input
              id="profile-phone"
              type="tel"
              placeholder="0912345678"
              {...register("phone")}
            />
            {errors.phone && (
              <FieldError className="text-destructive">
                {errors.phone.message}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="profile-email">Email đăng nhập</FieldLabel>
            <Input
              id="profile-email"
              value={profile.email}
              disabled
              readOnly
            />
            <FieldDescription>
              Email dùng để đăng nhập, không thể tự thay đổi tại đây.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="profile-role">Vai trò tài khoản</FieldLabel>
            <Input
              id="profile-role"
              value={roleLabel(profile.role)}
              disabled
              readOnly
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="profile-birthday">Ngày sinh</FieldLabel>
            <Input
              id="profile-birthday"
              type="date"
              {...register("birthday")}
            />
          </Field>

          <Field>
            <FieldLabel>Giới tính</FieldLabel>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select
                  items={GENDER_OPTIONS}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn giới tính" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={!isDirty || updateProfile.isPending}
          >
            Hủy thay đổi
          </Button>
          <Button
            type="submit"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? <Loader2 className="animate-spin" /> : <Save />}
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  );
}
