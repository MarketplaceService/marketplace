"use client";

import { useDeleteAddress, useSetDefaultAddress } from "@/hooks/use-addresses";
import { cn } from "@/lib/utils";
import { ProfileAddress } from "@/types/api.types";
import {
  Check,
  CheckCircle2,
  Loader2,
  LocateFixed,
  MapPinOff,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { AddressFormDialog } from "./address-form-dialog";
import { formatAddress } from "./address-utils";

interface AddressListProps {
  addresses: ProfileAddress[];
  isLoading: boolean;
}

export function AddressList({ addresses, isLoading }: AddressListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileAddress | null>(null);
  const [deleting, setDeleting] = useState<ProfileAddress | null>(null);
  const setDefault = useSetDefaultAddress();
  const deleteAddress = useDeleteAddress();

  const openForm = (address: ProfileAddress | null) => {
    setEditing(address);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Địa chỉ nhận dịch vụ</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quản lý danh sách địa chỉ và tọa độ GPS để hệ thống tìm nhà cung cấp gần bạn
            nhất.
          </p>
        </div>
        <Button
          className="shrink-0"
          onClick={() => openForm(null)}
        >
          <Plus />
          Thêm địa chỉ mới
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!isLoading && addresses.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MapPinOff className="h-8 w-8" />
          </div>
          <h4 className="text-lg font-bold text-foreground">Bạn chưa có địa chỉ nào</h4>
          <p className="mx-auto mt-1 max-w-md text-muted-foreground">
            Thêm địa chỉ nhận dịch vụ để kỹ thuật viên dễ dàng tìm đến phục vụ nhanh chóng.
          </p>
          <Button
            className="mt-5"
            onClick={() => openForm(null)}
          >
            <Plus />
            Thêm địa chỉ đầu tiên
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {addresses.map((address) => (
          <div
            key={address.id}
            className={cn(
              "flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm md:flex-row md:items-start",
              address.isDefault ? "border-2 border-primary/40" : "border-border",
            )}
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-bold text-foreground">{address.fullName}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{address.phone}</span>
                {address.isDefault && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    <CheckCircle2 className="h-3 w-3" />
                    Mặc định
                  </span>
                )}
              </div>
              <p className="text-foreground">
                {formatAddress(address)}
                {address.postalCode && (
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    (Mã bưu chính: {address.postalCode})
                  </span>
                )}
              </p>
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
                <LocateFixed className="h-3.5 w-3.5" />
                GPS: {address.latitude}, {address.longitude}
              </span>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {!address.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={setDefault.isPending}
                  onClick={() => setDefault.mutate(address.id)}
                >
                  <Check />
                  Đặt làm mặc định
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openForm(address)}
              >
                <Pencil />
                Chỉnh sửa
              </Button>
              {!address.isDefault && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleting(address)}
                >
                  <Trash2 />
                  Xóa
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AddressFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        address={editing}
      />

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa địa chỉ</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa địa chỉ này? Lịch sử các đơn đặt lịch cũ có sử dụng
              địa chỉ này vẫn được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={deleteAddress.isPending}
              onClick={() =>
                deleting &&
                deleteAddress.mutate(deleting.id, {
                  onSettled: () => setDeleting(null),
                })
              }
            >
              Xóa địa chỉ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
