"use client";

import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MIN_SEARCH_LENGTH, useAddressSuggestions } from "@/hooks/use-geocoding";
import { toastApiError } from "@/lib/api/api-error";
import { cn } from "@/lib/utils";
import {
  geocodingService,
  isGeocodingUnavailable,
  noteGeocodingError,
  type AddressSuggestion,
  type NearPoint,
  type ResolvedPlace,
} from "@/services/geocoding.services";
import { Loader2, MapPin } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

interface AddressAutocompleteProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  onPlaceSelect: (place: ResolvedPlace, suggestion: AddressSuggestion) => void;
  onBlur?: () => void;
  /** Ưu tiên gợi ý gần điểm này, thường là vị trí ghim hiện tại */
  near?: NearPoint;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
}

/** Ô nhập địa chỉ có danh sách gợi ý của MapVina, chọn một gợi ý thì trả về tọa độ của nó */
export function AddressAutocomplete({
  id,
  value,
  onValueChange,
  onPlaceSelect,
  onBlur,
  near,
  placeholder,
  className,
  invalid,
}: AddressAutocompleteProps) {
  const listId = useId();
  // Chỉ tìm khi người dùng đang gõ, không tìm cho giá trị có sẵn lúc mở form
  const [isTyping, setIsTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isResolving, setIsResolving] = useState(false);

  const debouncedValue = useDebouncedValue(value, 400);
  const { data: suggestions = [], error, isFetching } = useAddressSuggestions(
    isTyping ? debouncedValue : "",
    near,
  );

  const showList =
    isTyping && debouncedValue.trim().length >= MIN_SEARCH_LENGTH && suggestions.length > 0;

  const close = () => {
    setIsTyping(false);
    setActiveIndex(-1);
  };

  const select = async (suggestion: AddressSuggestion) => {
    close();
    setIsResolving(true);
    try {
      const place = await geocodingService.placeDetail(suggestion.placeId);
      if (!place) {
        toast.warning("Không tìm thấy vị trí của địa chỉ này");
        return;
      }
      onPlaceSelect(place, suggestion);
    } catch (selectError) {
      noteGeocodingError(selectError);
      if (!isGeocodingUnavailable(selectError)) {
        toastApiError(selectError, "Không lấy được vị trí của địa chỉ này");
      }
    } finally {
      setIsResolving(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      // Chặn Enter để không gửi form khi đang chọn gợi ý
      event.preventDefault();
      void select(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        className="pr-8"
        onChange={(event) => {
          onValueChange(event.target.value);
          setIsTyping(true);
          setActiveIndex(-1);
        }}
        onBlur={() => {
          close();
          onBlur?.();
        }}
        onKeyDown={handleKeyDown}
      />

      {(isFetching || isResolving) && (
        <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.placeId}
              role="option"
              aria-selected={index === activeIndex}
              // Giữ focus ở ô nhập để onBlur không đóng danh sách trước khi click
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void select(suggestion)}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                index === activeIndex ? "bg-muted" : "hover:bg-muted",
              )}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{suggestion.mainText}</span>
                {suggestion.secondaryText && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {suggestion.secondaryText}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isTyping && isGeocodingUnavailable(error) && (
        <p className="mt-1 text-xs text-muted-foreground">
          Gợi ý địa chỉ đang tạm tắt, bạn vẫn có thể nhập tay và chọn vị trí trên bản đồ.
        </p>
      )}
    </div>
  );
}
