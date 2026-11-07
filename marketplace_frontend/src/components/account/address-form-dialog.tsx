"use client";

import { useCreateAddress, useUpdateAddress } from "@/hooks/use-addresses";
import { CreateAddressDto, ProfileAddress } from "@/types/api.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, LocateFixed } from "lucide-react";
import dynamic from "next/dynamic";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { PHONE_PATTERN } from "./address-utils";

const AddressMapPicker = dynamic(() => import("./address-map-picker"), {
  ssr: false,
  loading: () => <div className="h-[220px] w-full rounded-lg bg-muted" />,
});

const DEFAULT_LATITUDE = 10.774512;
const DEFAULT_LONGITUDE = 106.703418;
const COORDINATE_PRECISION = 7;

const requiredText = (message: string, max: number) =>
  z.string().trim().min(1, message).max(max, `Tối đa ${max} ký tự`);

const optionalText = (max: number) =>
  z.string().trim().max(max, `Tối đa ${max} ký tự`);

const addressSchema = z.object({
  fullName: requiredText("Vui lòng nhập họ tên người nhận", 100),
  phone: z.string().trim().regex(PHONE_PATTERN, "Số điện thoại không hợp lệ"),
  city: requiredText("Vui lòng nhập tỉnh hoặc thành phố", 100),
  district: optionalText(100),
  ward: requiredText("Vui lòng nhập phường hoặc xã", 100),
  addressLine1: requiredText("Vui lòng nhập số nhà và tên đường", 255),
  addressLine2: optionalText(255),
  postalCode: optionalText(20),
  latitude: z
    .number("Vĩ độ không hợp lệ")
    .min(-90, "Vĩ độ phải từ -90 đến 90")
    .max(90, "Vĩ độ phải từ -90 đến 90"),
  longitude: z
    .number("Kinh độ không hợp lệ")
    .min(-180, "Kinh độ phải từ -180 đến 180")
    .max(180, "Kinh độ phải từ -180 đến 180"),
  isDefault: z.boolean(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

function toFormValues(address: ProfileAddress | null): AddressFormValues {
  return {
    fullName: address?.fullName ?? "",
    phone: address?.phone ?? "",
    city: address?.city ?? "",
    district: address?.district ?? "",
    ward: address?.ward ?? "",
    addressLine1: address?.addressLine1 ?? "",
    addressLine2: address?.addressLine2 ?? "",
    postalCode: address?.postalCode ?? "",
    latitude: address?.latitude ?? DEFAULT_LATITUDE,
    longitude: address?.longitude ?? DEFAULT_LONGITUDE,
    isDefault: address?.isDefault ?? false,
  };
}

function toPayload(data: AddressFormValues): CreateAddressDto {
  return {
    ...data,
    district: data.district || null,
    addressLine2: data.addressLine2 || null,
    postalCode: data.postalCode || null,
    latitude: Number(data.latitude.toFixed(COORDINATE_PRECISION)),
    longitude: Number(data.longitude.toFixed(COORDINATE_PRECISION)),
  };
}

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: ProfileAddress | null;
}

export function AddressFormDialog({
  open,
  onOpenChange,
  address,
}: AddressFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl!">
        <DialogHeader>
          <DialogTitle>{address ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}</DialogTitle>
          <DialogDescription>
            Điền thông tin người nhận và ghim vị trí chính xác trên bản đồ.
          </DialogDescription>
        </DialogHeader>
        <AddressForm
          key={address?.id ?? "new"}
          address={address}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddressForm({
  address,
  onClose,
}: {
  address: ProfileAddress | null;
  onClose: () => void;
}) {
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const isPending = createAddress.isPending || updateAddress.isPending;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: toFormValues(address),
  });

  const latitude = useWatch({ control, name: "latitude" });
  const longitude = useWatch({ control, name: "longitude" });

  const setCoordinates = (lat: number, lng: number) => {
    setValue("latitude", Number(lat.toFixed(COORDINATE_PRECISION)), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue("longitude", Number(lng.toFixed(COORDINATE_PRECISION)), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const fillCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.warning("Trình duyệt không hỗ trợ lấy vị trí");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setCoordinates(coords.latitude, coords.longitude),
      () => toast.warning("Không lấy được vị trí, vui lòng chọn trên bản đồ"),
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };

  const onSubmit = (data: AddressFormValues) => {
    const payload = toPayload(data);
    const options = { onSuccess: onClose };

    if (address) {
      updateAddress.mutate({ id: address.id, data: payload }, options);
    } else {
      createAddress.mutate(payload, options);
    }
  };

  const textField = (
    name: Exclude<keyof AddressFormValues, "latitude" | "longitude" | "isDefault">,
    label: string,
    options: { placeholder?: string; required?: boolean; type?: string } = {},
  ) => (
    <Field>
      <FieldLabel htmlFor={`address-${name}`}>
        {label}
        {options.required && <span className="text-destructive">*</span>}
      </FieldLabel>
      <Input
        id={`address-${name}`}
        type={options.type}
        placeholder={options.placeholder}
        {...register(name)}
      />
      {errors[name] && (
        <FieldError className="text-destructive">{errors[name]?.message}</FieldError>
      )}
    </Field>
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        {textField("fullName", "Họ và tên người nhận", {
          required: true,
          placeholder: "Nguyễn Văn A",
        })}
        {textField("phone", "Số điện thoại liên hệ", {
          required: true,
          type: "tel",
          placeholder: "0912345678",
        })}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
        {textField("city", "Tỉnh / Thành phố", {
          required: true,
          placeholder: "TP. Hồ Chí Minh",
        })}
        {textField("district", "Quận / Huyện", { placeholder: "Quận 1" })}
        {textField("ward", "Phường / Xã", {
          required: true,
          placeholder: "Phường Bến Nghé",
        })}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          {textField("addressLine1", "Số nhà, tên đường", {
            required: true,
            placeholder: "123 Nguyễn Huệ",
          })}
        </div>
        {textField("postalCode", "Mã bưu chính", { placeholder: "700000" })}
      </div>

      {textField("addressLine2", "Tòa nhà, số tầng, ghi chú thêm", {
        placeholder: "Tầng 4, Tòa nhà Sun Wah...",
      })}

      <div className="space-y-3 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">
            Ghim tọa độ GPS <span className="text-destructive">*</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fillCurrentLocation}
          >
            <LocateFixed />
            Lấy vị trí hiện tại
          </Button>
        </div>

        <AddressMapPicker
          latitude={latitude}
          longitude={longitude}
          onChange={setCoordinates}
        />
        <p className="text-xs text-muted-foreground">
          Kéo thả ghim hoặc nhấp trực tiếp trên bản đồ để xác định tọa độ chính xác.
        </p>

        <div className="grid grid-cols-2 items-start gap-4">
          <Field>
            <FieldLabel htmlFor="address-latitude">Vĩ độ (-90 đến 90)</FieldLabel>
            <Input
              id="address-latitude"
              type="number"
              step="any"
              className="font-mono"
              {...register("latitude", { valueAsNumber: true })}
            />
            {errors.latitude && (
              <FieldError className="text-destructive">
                {errors.latitude.message}
              </FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="address-longitude">Kinh độ (-180 đến 180)</FieldLabel>
            <Input
              id="address-longitude"
              type="number"
              step="any"
              className="font-mono"
              {...register("longitude", { valueAsNumber: true })}
            />
            {errors.longitude && (
              <FieldError className="text-destructive">
                {errors.longitude.message}
              </FieldError>
            )}
          </Field>
        </div>
      </div>

      <Controller
        control={control}
        name="isDefault"
        render={({ field }) => (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              disabled={address?.isDefault}
            />
            Đặt làm địa chỉ mặc định
          </label>
        )}
      />

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Check />}
          Lưu địa chỉ
        </Button>
      </DialogFooter>
    </form>
  );
}
