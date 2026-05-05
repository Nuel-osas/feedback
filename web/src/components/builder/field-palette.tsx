"use client";

import {
  AlignLeft,
  AtSign,
  Calendar,
  CheckSquare,
  Hash,
  Image as ImageIcon,
  Link as LinkIcon,
  ListChecks,
  ListPlus,
  Star,
  Type,
  Video,
  Wallet,
  TextCursorInput,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBuilder } from "./store";
import type { FieldType } from "@/lib/schema";

const types: Array<{ type: FieldType; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { type: "short_text", label: "Short text", Icon: TextCursorInput },
  { type: "long_text", label: "Long text", Icon: AlignLeft },
  { type: "rich_text", label: "Rich text", Icon: Type },
  { type: "dropdown", label: "Dropdown", Icon: ListChecks },
  { type: "multi_select", label: "Multi-select", Icon: ListPlus },
  { type: "checkbox", label: "Checkbox", Icon: CheckSquare },
  { type: "rating", label: "Rating", Icon: Star },
  { type: "screenshot", label: "Screenshot", Icon: ImageIcon },
  { type: "video", label: "Video", Icon: Video },
  { type: "url", label: "URL", Icon: LinkIcon },
  { type: "number", label: "Number", Icon: Hash },
  { type: "date", label: "Date", Icon: Calendar },
  { type: "email", label: "Email", Icon: AtSign },
  { type: "wallet", label: "Sui wallet", Icon: Wallet },
];

export function FieldPalette() {
  const addField = useBuilder((s) => s.addField);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Add field</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {types.map(({ type, label, Icon }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addField(type)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
