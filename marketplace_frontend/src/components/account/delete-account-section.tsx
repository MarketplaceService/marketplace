"use client";

import { useDeleteAccount } from "@/hooks/use-profile";
import { AlertTriangle } from "lucide-react";
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

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const deleteAccount = useDeleteAccount();

  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 sm:flex-row sm:items-center">
      <div>
        <h4 className="flex items-center gap-2 font-bold text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Xóa tài khoản
        </h4>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Tài khoản của bạn sẽ bị vô hiệu hóa và đăng xuất khỏi hệ thống. Bạn không thể
          xóa tài khoản khi đang có đơn đặt lịch đã xác nhận hoặc đang thực hiện.
        </p>
      </div>
      <Button
        variant="destructive"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        Yêu cầu xóa tài khoản
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa tài khoản</DialogTitle>
            <DialogDescription>
              Tài khoản sẽ bị vô hiệu hóa và bạn sẽ được đăng xuất ngay lập tức. Bạn
              không thể đăng ký lại bằng email này.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              disabled={deleteAccount.isPending}
              onClick={() =>
                deleteAccount.mutate(undefined, { onSettled: () => setOpen(false) })
              }
            >
              Xác nhận xóa tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
