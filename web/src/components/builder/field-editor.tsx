"use client";

import { Plus, X } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBuilder, findField } from "./store";

/** Bare field-settings body — embed inline anywhere a field row is expanded. */
export function FieldEditorBody({ fieldId }: { fieldId: string }) {
  const schema = useBuilder((s) => s.schema);
  const update = useBuilder((s) => s.updateField);
  const field = findField(schema, fieldId);
  if (!field) return null;

  return (
    <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input
            value={field.label}
            onChange={(e) => update(field.id, { label: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Help text</Label>
          <Textarea
            rows={2}
            value={field.help ?? ""}
            onChange={(e) => update(field.id, { help: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Placeholder</Label>
          <Input
            value={field.placeholder ?? ""}
            onChange={(e) => update(field.id, { placeholder: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor={`req-${field.id}`}>Required</Label>
          <Switch
            id={`req-${field.id}`}
            checked={field.required}
            onCheckedChange={(v) => update(field.id, { required: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor={`priv-${field.id}`}>Private (encrypted)</Label>
            <p className="text-xs text-muted-foreground">
              {field.private
                ? "Seal-encrypted. Only form admins can decrypt."
                : "Public — anyone with the Walrus blob ID can read this value."}
            </p>
          </div>
          <Switch
            id={`priv-${field.id}`}
            checked={field.private}
            onCheckedChange={(v) => update(field.id, { private: v })}
          />
        </div>

        {(field.type === "dropdown" || field.type === "multi_select") && (
          <OptionsEditor
            fieldId={field.id}
            options={field.options ?? []}
            onChange={(options) => update(field.id, { options })}
          />
        )}

        {field.type === "rating" && (
          <div className="space-y-1.5">
            <Label>Scale</Label>
            <Input
              type="number"
              min={3}
              max={10}
              value={field.validation?.scale ?? 5}
              onChange={(e) =>
                update(field.id, {
                  validation: {
                    ...field.validation,
                    scale: Math.min(10, Math.max(3, Number(e.target.value) || 5)),
                  },
                })
              }
            />
          </div>
        )}

        {(field.type === "short_text" ||
          field.type === "long_text" ||
          field.type === "rich_text") && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Min length</Label>
              <Input
                type="number"
                value={field.validation?.minLength ?? ""}
                onChange={(e) =>
                  update(field.id, {
                    validation: {
                      ...field.validation,
                      minLength: e.target.value === "" ? undefined : Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max length</Label>
              <Input
                type="number"
                value={field.validation?.maxLength ?? ""}
                onChange={(e) =>
                  update(field.id, {
                    validation: {
                      ...field.validation,
                      maxLength: e.target.value === "" ? undefined : Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
        )}

        {field.type === "number" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Min</Label>
              <Input
                type="number"
                value={field.validation?.min ?? ""}
                onChange={(e) =>
                  update(field.id, {
                    validation: {
                      ...field.validation,
                      min: e.target.value === "" ? undefined : Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max</Label>
              <Input
                type="number"
                value={field.validation?.max ?? ""}
                onChange={(e) =>
                  update(field.id, {
                    validation: {
                      ...field.validation,
                      max: e.target.value === "" ? undefined : Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
        )}

        {(field.type === "screenshot" || field.type === "video") && (
          <div className="space-y-1.5">
            <Label className="text-xs">Max file size (MB)</Label>
            <Input
              type="number"
              value={field.validation?.maxFileSizeMb ?? (field.type === "video" ? 50 : 10)}
              onChange={(e) =>
                update(field.id, {
                  validation: {
                    ...field.validation,
                    maxFileSizeMb: Number(e.target.value) || undefined,
                  },
                })
              }
            />
          </div>
        )}
    </div>
  );
}

function OptionsEditor({
  fieldId,
  options,
  onChange,
}: {
  fieldId: string;
  options: Array<{ id: string; label: string; value: string }>;
  onChange: (opts: Array<{ id: string; label: string; value: string }>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Options</Label>
      <div className="space-y-2">
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <Input
              value={opt.label}
              placeholder="Label"
              onChange={(e) => {
                const next = options.slice();
                next[idx] = {
                  ...opt,
                  label: e.target.value,
                  value: opt.value || slugify(e.target.value),
                };
                onChange(next);
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onChange(options.filter((o) => o.id !== opt.id))}
              aria-label="Remove option"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([
              ...options,
              {
                id: `${fieldId}-${nanoid(4)}`,
                label: `Option ${options.length + 1}`,
                value: `option_${options.length + 1}`,
              },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5" /> Add option
        </Button>
      </div>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}
