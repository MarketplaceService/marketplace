import { isAxiosError, isCancel } from "axios";
import { toast } from "sonner";

type ApiErrorBody = {
  message?: string | string[];
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message) && message.length > 0) return message[0];
    if (typeof message === "string" && message) return message;
    return fallback;
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}

function isHandledGlobally(error: unknown): boolean {
  if (isCancel(error)) return true;
  if (!isAxiosError(error)) return false;
  return !error.response || error.response.status === 403;
}

export function toastApiError(error: unknown, fallback: string): void {
  if (isHandledGlobally(error)) return;
  toast.error(getApiErrorMessage(error, fallback));
}

export function mutationErrorToast(fallback: string) {
  return (error: unknown) => toastApiError(error, fallback);
}
