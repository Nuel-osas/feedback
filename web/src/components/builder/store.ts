"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Field, FieldType, FormSchema } from "@/lib/schema";
import { defaultFieldFor } from "@/lib/schema";

type State = {
  schema: FormSchema;
  selectedFieldId: string | null;
  dirty: boolean;
};

type Actions = {
  setSchema: (s: FormSchema) => void;
  setTitle: (t: string) => void;
  setDescription: (d: string) => void;
  setSetting: <K extends keyof FormSchema["settings"]>(
    key: K,
    value: FormSchema["settings"][K],
  ) => void;
  setTheme: (color: string) => void;
  addField: (type: FieldType, sectionIndex?: number) => string;
  updateField: (id: string, patch: Partial<Field>) => void;
  removeField: (id: string) => void;
  moveField: (id: string, toIndex: number) => void;
  selectField: (id: string | null) => void;
  reset: () => void;
};

const blankSchema: FormSchema = {
  version: 1,
  formVersion: 1,
  title: "Untitled form",
  description: "",
  theme: { primary: "#0ea5e9", mode: "auto" },
  settings: {
    requireWallet: false,
    onePerWallet: false,
    captcha: false,
    successMessage: "Thanks for your submission.",
  },
  sections: [{ id: nanoid(8), fields: [] }],
};

export const useBuilder = create<State & Actions>((set, get) => ({
  schema: structuredClone(blankSchema),
  selectedFieldId: null,
  dirty: false,

  setSchema: (s) => set({ schema: s, dirty: false, selectedFieldId: null }),
  setTitle: (t) =>
    set((st) => ({ schema: { ...st.schema, title: t }, dirty: true })),
  setDescription: (d) =>
    set((st) => ({ schema: { ...st.schema, description: d }, dirty: true })),
  setSetting: (key, value) =>
    set((st) => ({
      schema: { ...st.schema, settings: { ...st.schema.settings, [key]: value } },
      dirty: true,
    })),
  setTheme: (color) =>
    set((st) => ({
      schema: { ...st.schema, theme: { ...st.schema.theme, primary: color } },
      dirty: true,
    })),

  addField: (type, sectionIndex = 0) => {
    const id = nanoid(8);
    const field = defaultFieldFor(type, id);
    set((st) => {
      const sections = st.schema.sections.slice();
      const section = { ...sections[sectionIndex] };
      section.fields = [...section.fields, field];
      sections[sectionIndex] = section;
      return {
        schema: { ...st.schema, sections },
        dirty: true,
        selectedFieldId: id,
      };
    });
    return id;
  },

  updateField: (id, patch) =>
    set((st) => {
      const sections = st.schema.sections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      }));
      return { schema: { ...st.schema, sections }, dirty: true };
    }),

  removeField: (id) =>
    set((st) => {
      const sections = st.schema.sections.map((sec) => ({
        ...sec,
        fields: sec.fields.filter((f) => f.id !== id),
      }));
      return {
        schema: { ...st.schema, sections },
        dirty: true,
        selectedFieldId: st.selectedFieldId === id ? null : st.selectedFieldId,
      };
    }),

  moveField: (id, toIndex) =>
    set((st) => {
      const sections = st.schema.sections.map((sec) => {
        const idx = sec.fields.findIndex((f) => f.id === id);
        if (idx === -1) return sec;
        const fields = sec.fields.slice();
        const [moved] = fields.splice(idx, 1);
        fields.splice(toIndex, 0, moved);
        return { ...sec, fields };
      });
      return { schema: { ...st.schema, sections }, dirty: true };
    }),

  selectField: (id) => set({ selectedFieldId: id }),

  reset: () =>
    set({ schema: structuredClone(blankSchema), selectedFieldId: null, dirty: false }),
}));

export function findField(schema: FormSchema, id: string): Field | undefined {
  for (const sec of schema.sections) {
    const f = sec.fields.find((x) => x.id === id);
    if (f) return f;
  }
  return undefined;
}

export function allFields(schema: FormSchema): Field[] {
  return schema.sections.flatMap((s) => s.fields);
}

export { blankSchema };
