import { mutationErrorToast } from "@/lib/api/api-error";
import { addressService } from "@/services/address.services";
import { CreateAddressDto, UpdateAddressDto } from "@/types/api.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ADDRESSES_QUERY_KEY = ["addresses"];

export const useAddresses = (enabled = true) => {
  return useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: addressService.list,
    enabled,
  });
};

const useAddressMutation = <TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  messages: { success: string; error: string },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
      toast.success(messages.success);
    },

    onError: mutationErrorToast(messages.error),
  });
};

export const useCreateAddress = () =>
  useAddressMutation((data: CreateAddressDto) => addressService.create(data), {
    success: "Đã thêm địa chỉ mới",
    error: "Không thể thêm địa chỉ",
  });

export const useUpdateAddress = () =>
  useAddressMutation(
    ({ id, data }: { id: string; data: UpdateAddressDto }) =>
      addressService.update(id, data),
    {
      success: "Đã cập nhật địa chỉ",
      error: "Không thể cập nhật địa chỉ",
    },
  );

export const useSetDefaultAddress = () =>
  useAddressMutation((id: string) => addressService.setDefault(id), {
    success: "Đã đặt làm địa chỉ mặc định",
    error: "Không thể đặt địa chỉ mặc định",
  });

export const useDeleteAddress = () =>
  useAddressMutation((id: string) => addressService.remove(id), {
    success: "Đã xóa địa chỉ",
    error: "Không thể xóa địa chỉ",
  });
