"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBuilder } from "./store";
import { FieldRenderer } from "./field-renderer";
import { cn } from "@/lib/utils";
import type { Field } from "@/lib/schema";

export function FieldList() {
  const schema = useBuilder((s) => s.schema);
  const selectedId = useBuilder((s) => s.selectedFieldId);
  const selectField = useBuilder((s) => s.selectField);
  const removeField = useBuilder((s) => s.removeField);
  const moveField = useBuilder((s) => s.moveField);

  const fields = schema.sections[0]?.fields ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const fromIdx = fields.findIndex((f) => f.id === e.active.id);
    const toIdx = fields.findIndex((f) => f.id === e.over!.id);
    if (fromIdx === -1 || toIdx === -1) return;
    const id = fields[fromIdx].id;
    const reordered = arrayMove(fields, fromIdx, toIdx);
    const newIdx = reordered.findIndex((f) => f.id === id);
    moveField(id, newIdx);
  }

  if (fields.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No fields yet. Add one from the palette to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {fields.map((f) => (
            <SortableFieldRow
              key={f.id}
              field={f}
              selected={selectedId === f.id}
              onSelect={() => selectField(f.id)}
              onRemove={() => removeField(f.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableFieldRow({
  field,
  selected,
  onSelect,
  onRemove,
}: {
  field: Field;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          "cursor-pointer transition-colors",
          selected && "border-sky-500 ring-2 ring-sky-500/20",
        )}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab text-muted-foreground hover:text-foreground p-1"
              onClick={(e) => e.stopPropagation()}
              aria-label="Drag handle"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex-1 pointer-events-none">
              <FieldRenderer field={field} disabled />
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label="Remove field"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
