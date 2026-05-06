"use client";

import { useEffect } from "react";
import { Builder } from "@/components/builder/builder";
import { useBuilder } from "@/components/builder/store";

export default function NewFormPage() {
  const reset = useBuilder((s) => s.reset);
  useEffect(() => {
    reset();
  }, [reset]);
  return <Builder />;
}
