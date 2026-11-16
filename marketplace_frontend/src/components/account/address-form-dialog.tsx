"use client";

import { useCreateAddress, useUpdateAddress } from "@/hooks/use-addresses";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  geocodingService,
  isGeocodingDisabled,
  noteGeocodingError,
  type AddressSuggestion,
  type ResolvedPlace,
} from "@/services/geocoding.services";
import { CreateAddressDto, ProfileAddress } from "@/types/api.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { AddressAutocomplete } from "../map/address-autocomplete";
import { isInsideMapBounds } from "../map/map-bounds";
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
import { composeAddress, PHONE_PATTERN, streetFromPlace } from "./address-utils";

const AddressMapPicker = dynamic(() => import("./address-map-picker"), {
  ssr: false,
  loading: () => <div className="h-[220px] w-full rounded-lg bg-muted" />,
});

const DEFAULT_LATITUDE = 10.774512;
const DEFAULT_LONGITUDE = 106.703418;
const COORDINATE_PRECISION = 7;
// Chờ người dùng ngừng gõ rồi mới tra tọa độ, vì mỗi request đều tính vào hạn mức MapVina
const GEOCODE_DELAY_MS = 800;

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
type AddressTextField = "addressLine1" | "ward" | "district" | "city";

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
    getValues,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: toFormValues(address),
  });

  const latitude = useWatch({ control, name: "latitude" });
  const longitude = useWatch({ control, name: "longitude" });
  const [addressLine1, ward, district, city] = useWatch({
    control,
    name: ["addressLine1", "ward", "district", "city"],
  });

  // Địa chỉ ứng với vị trí ghim hiện tại. Chỉ tra lại tọa độ khi người dùng sửa địa chỉ
  // khác đi, nên mở form sửa hay kéo ghim bằng tay đều không bị dời ghim.
  const pinnedAddressRef = useRef(composeAddress(getValues()));
  const debouncedAddress = useDebouncedValue(
    composeAddress({ addressLine1, ward, district, city }),
    GEOCODE_DELAY_MS,
  );
  const [locatedPlace, setLocatedPlace] = useState<ResolvedPlace | null>(null);

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

  const moveToPlace = (place: ResolvedPlace) => {
    if (!isInsideMapBounds(place.latitude, place.longitude)) {
      toast.warning("Địa chỉ này nằm ngoài vùng bản đồ hỗ trợ");
      return;
    }
    setCoordinates(place.latitude, place.longitude);
  };

  const setAddressFields = (values: Partial<Record<AddressTextField, string>>) => {
    for (const [field, value] of Object.entries(values) as [AddressTextField, string][]) {
      setValue(field, value, { shouldValidate: true, shouldDirty: true });
    }
    pinnedAddressRef.current = composeAddress(getValues());
  };

  useEffect(() => {
    if (debouncedAddress === pinnedAddressRef.current) return;
    if (!addressLine1.trim() || !city.trim() || isGeocodingDisabled()) return;

    pinnedAddressRef.current = debouncedAddress;
    let cancelled = false;

    geocodingService
      .geocode(debouncedAddress)
      .then((place) => {
        if (!cancelled && place) moveToPlace(place);
      })
      .catch(noteGeocodingError);

    return () => {
      cancelled = true;
    };
    // Chỉ chạy khi địa chỉ đã ngừng thay đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAddress]);

  // Chọn gợi ý thì điền các ô hành chính còn trống và đưa ghim tới đó
  const applySuggestion = (place: ResolvedPlace, suggestion: AddressSuggestion) => {
    const fill: Partial<Record<AddressTextField, string>> = {
      addressLine1: place.street || suggestion.mainText,
    };
    if (!getValues("ward").trim() && place.ward) fill.ward = place.ward;
    if (!getValues("district")?.trim() && place.district) fill.district = place.district;
    if (!getValues("city").trim() && place.province) fill.city = place.province;

    // Gợi ý là tên tòa nhà hay địa điểm (ví dụ "Landmark 81") thì số nhà, tên đường lấy từ chi tiết
    // địa điểm, còn tên đó đưa vào ô ghi chú nếu ô này đang trống
    const isPlaceName = !!place.street && !/^\d/.test(suggestion.mainText);
    if (isPlaceName && !getValues("addressLine2")?.trim()) {
      setValue("addressLine2", suggestion.mainText, { shouldDirty: true });
    }

    setAddressFields(fill);
    moveToPlace(place);
  };

  const fillFromLocatedPlace = (place: ResolvedPlace) => {
    setAddressFields({
      addressLine1: place.street || streetFromPlace(place),
      ward: place.ward ?? "",
      district: place.district ?? "",
      city: place.province ?? "",
    });
    setLocatedPlace(null);
  };

  // Định vị xong thì tra địa chỉ tại đó. Form còn trống thì điền luôn, đã có chữ thì hỏi trước
  const handleLocated = async (lat: number, lng: number) => {
    if (isGeocodingDisabled()) return;
    try {
      const place = await geocodingService.reverse(lat, lng);
      if (!place) return;

      const current = getValues(["addressLine1", "ward", "district", "city"]);
      if (current.every((value) => !value?.trim())) {
        fillFromLocatedPlace(place);
      } else {
        setLocatedPlace(place);
      }
    } catch (error) {
      noteGeocodingError(error);
    }
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
    name: Exclude<
      keyof AddressFormValues,
      "latitude" | "longitude" | "isDefault" | "addressLine1"
    >,
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
          <Field>
            <FieldLabel htmlFor="address-addressLine1">
              Số nhà, tên đường
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              control={control}
              name="addressLine1"
              render={({ field }) => (
                <AddressAutocomplete
                  id="address-addressLine1"
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  onPlaceSelect={applySuggestion}
                  near={{ latitude, longitude }}
                  placeholder="123 Nguyễn Huệ"
                  invalid={!!errors.addressLine1}
                />
              )}
            />
            {errors.addressLine1 && (
              <FieldError className="text-destructive">
                {errors.addressLine1.message}
              </FieldError>
            )}
          </Field>
        </div>
        {textField("postalCode", "Mã bưu chính", { placeholder: "700000" })}
      </div>

      {textField("addressLine2", "Tòa nhà, số tầng, ghi chú thêm", {
        placeholder: "Tầng 4, Tòa nhà Sun Wah...",
      })}

      <div className="space-y-3 border-t border-border pt-3">
        <span className="text-sm font-medium text-foreground">
          Ghim tọa độ GPS <span className="text-destructive">*</span>
        </span>

        <AddressMapPicker
          latitude={latitude}
          longitude={longitude}
          onChange={setCoordinates}
          onLocated={(lat, lng) => void handleLocated(lat, lng)}
        />
        <p className="text-xs text-muted-foreground">
          Gõ địa chỉ để ghim tự di chuyển, hoặc kéo thả ghim, nhấp trên bản đồ, bấm nút định
          vị ở góc bản đồ để chọn vị trí chính xác.
        </p>

        {locatedPlace && (
          <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Địa chỉ tại vị trí hiện tại</p>
                <p className="font-medium text-foreground">{locatedPlace.formattedAddress}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => fillFromLocatedPlace(locatedPlace)}
              >
                Dùng địa chỉ này
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setLocatedPlace(null)}
              >
                Bỏ qua
              </Button>
            </div>
          </div>
        )}

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
