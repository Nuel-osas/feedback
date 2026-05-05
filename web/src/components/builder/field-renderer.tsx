"use client";

import { Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Field } from "@/lib/schema";
import { cn } from "@/lib/utils";

type Props = {
  field: Field;
  value?: unknown;
  onChange?: (value: unknown) => void;
  onFile?: (file: File) => void;
  disabled?: boolean;
  error?: string;
};

export function FieldRenderer({ field, value, onChange, onFile, disabled, error }: Props) {
  const id = `field-${field.id}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        <span>
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {field.private && (
          <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
            private
          </span>
        )}
      </Label>
      {field.help && (
        <p className="text-xs text-muted-foreground">{field.help}</p>
      )}
      <FieldControl
        id={id}
        field={field}
        value={value}
        onChange={onChange}
        onFile={onFile}
        disabled={disabled}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function FieldControl({ id, field, value, onChange, onFile, disabled }: Props & { id: string }) {
  const set = (v: unknown) => onChange?.(v);
  switch (field.type) {
    case "short_text":
    case "url":
    case "email":
    case "wallet":
      return (
        <Input
          id={id}
          type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
        />
      );
    case "long_text":
    case "rich_text":
      return (
        <Textarea
          id={id}
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
          rows={field.type === "rich_text" ? 6 : 4}
        />
      );
    case "number":
      return (
        <Input
          id={id}
          type="number"
          placeholder={field.placeholder}
          value={(value as number) ?? ""}
          onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))}
          disabled={disabled}
        />
      );
    case "date":
      return (
        <Input
          id={id}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
        />
      );
    case "checkbox":
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={!!value}
            onCheckedChange={(v) => set(!!v)}
            disabled={disabled}
          />
          <Label htmlFor={id} className="font-normal text-sm">
            {field.placeholder ?? "I confirm"}
          </Label>
        </div>
      );
    case "dropdown":
      return (
        <Select
          value={(value as string) ?? ""}
          onValueChange={set}
          disabled={disabled}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder={field.placeholder ?? "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.id} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "multi_select": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="grid grid-cols-2 gap-2">
          {(field.options ?? []).map((o) => {
            const checked = arr.includes(o.value);
            return (
              <label
                key={o.id}
                className={cn(
                  "flex items-center gap-2 border border-border rounded-md px-3 py-2 cursor-pointer hover:bg-accent",
                  checked && "border-sky-500 bg-sky-50 dark:bg-sky-950/30",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    set(v ? [...arr, o.value] : arr.filter((x) => x !== o.value));
                  }}
                  disabled={disabled}
                />
                <span className="text-sm">{o.label}</span>
              </label>
            );
          })}
        </div>
      );
    }
    case "rating": {
      const scale = field.validation?.scale ?? 5;
      const v = Number(value ?? 0);
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: scale }).map((_, i) => {
            const n = i + 1;
            return (
              <button
                key={n}
                type="button"
                disabled={disabled}
                onClick={() => set(n)}
                className="p-1 hover:scale-110 transition-transform"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "h-6 w-6",
                    n <= v ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                  )}
                />
              </button>
            );
          })}
        </div>
      );
    }
    case "screenshot":
    case "video": {
      const accept = field.type === "video" ? "video/*" : "image/*";
      const file = value as { name?: string; bytes?: number } | undefined;
      return (
        <div className="space-y-2">
          <Input
            id={id}
            type="file"
            accept={accept}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile?.(f);
            }}
            disabled={disabled}
          />
          {file?.name && (
            <p className="text-xs text-muted-foreground">
              Selected: {file.name}
              {file.bytes ? ` (${(file.bytes / 1024).toFixed(0)} KB)` : ""}
            </p>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
