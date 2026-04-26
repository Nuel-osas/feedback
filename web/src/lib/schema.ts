import { z } from "zod";

export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "rich_text",
  "dropdown",
  "multi_select",
  "checkbox",
  "rating",
  "screenshot",
  "video",
  "url",
  "number",
  "date",
  "email",
  "wallet",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FieldOption = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});

export const Conditional = z.object({
  fieldId: z.string(),
  equals: z.unknown(),
});

export const Validation = z
  .object({
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().positive().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    integer: z.boolean().optional(),
    minSelected: z.number().int().nonnegative().optional(),
    maxSelected: z.number().int().nonnegative().optional(),
    maxFileSizeMb: z.number().positive().optional(),
    scale: z.number().int().min(3).max(10).optional(),
  })
  .partial();

export const Field = z.object({
  id: z.string(),
  type: z.enum(FIELD_TYPES),
  label: z.string().min(1),
  help: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  private: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
  validation: Validation.optional(),
  options: z.array(FieldOption).optional(),
  conditional: Conditional.optional(),
});

export const FormSection = z.object({
  id: z.string(),
  title: z.string().optional(),
  fields: z.array(Field),
});

export const FormSettings = z.object({
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
  maxSubmissions: z.number().int().positive().optional(),
  requireWallet: z.boolean().default(false),
  onePerWallet: z.boolean().default(false),
  captcha: z.boolean().default(false),
  successMessage: z.string().default("Thanks for your submission."),
  redirectUrl: z.string().url().optional(),
});

export const FormSchema = z.object({
  version: z.number().int().default(1),
  formVersion: z.number().int().default(1),
  title: z.string().min(1),
  description: z.string().default(""),
  bannerBlobId: z.string().optional(),
  theme: z
    .object({
      primary: z.string().default("#0ea5e9"),
      mode: z.enum(["light", "dark", "auto"]).default("auto"),
    })
    .default({ primary: "#0ea5e9", mode: "auto" }),
  settings: FormSettings.default({
    requireWallet: false,
    onePerWallet: false,
    captcha: false,
    successMessage: "Thanks for your submission.",
  }),
  sections: z.array(FormSection).default([]),
});

export type Field = z.infer<typeof Field>;
export type FormSection = z.infer<typeof FormSection>;
export type FormSettings = z.infer<typeof FormSettings>;
export type FormSchema = z.infer<typeof FormSchema>;

// ---------- Submission types ----------

export const PlainValue = z.object({
  kind: z.literal("plaintext"),
  value: z.unknown(),
});
export const MediaValue = z.object({
  kind: z.literal("media"),
  blobId: z.string(),
  mime: z.string(),
  bytes: z.number(),
  name: z.string(),
});
export const EncryptedValue = z.object({
  kind: z.literal("encrypted"),
  envelope: z.object({
    mode: z.enum(["placeholder", "seal"]),
    b64: z.string(),
    sealId: z.string().optional(),
  }),
});
export const FieldValue = z.union([PlainValue, MediaValue, EncryptedValue]);

export const Submission = z.object({
  formId: z.string(),
  formVersion: z.number().int(),
  submittedAt: z.string(),
  submitter: z.string().optional(),
  fields: z.record(z.string(), FieldValue),
});

export type FieldValue = z.infer<typeof FieldValue>;
export type Submission = z.infer<typeof Submission>;

// ---------- Field defaults helper ----------

export function defaultFieldFor(type: FieldType, id: string): Field {
  const base = {
    id,
    type,
    label: defaultLabelFor(type),
    required: false,
    private: false,
  } as Field;
  if (type === "dropdown" || type === "multi_select") {
    base.options = [
      { id: `${id}-1`, label: "Option 1", value: "option_1" },
      { id: `${id}-2`, label: "Option 2", value: "option_2" },
    ];
  }
  if (type === "rating") {
    base.validation = { scale: 5 };
  }
  return base;
}

function defaultLabelFor(type: FieldType): string {
  const map: Record<FieldType, string> = {
    short_text: "Short answer",
    long_text: "Long answer",
    rich_text: "Rich text",
    dropdown: "Pick one",
    multi_select: "Pick any",
    checkbox: "Confirm",
    rating: "Rating",
    screenshot: "Screenshot",
    video: "Video",
    url: "Link",
    number: "Number",
    date: "Date",
    email: "Email",
    wallet: "Sui wallet address",
  };
  return map[type];
}
