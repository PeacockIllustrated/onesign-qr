'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BioLinkItemForm } from '@/components/bio/bio-link-item-form';
import { cn } from '@/lib/utils';
import { truncate } from '@/lib/utils';
import { BIO_DEFAULTS } from '@/lib/constants';
import type { BioLinkItem } from '@/types/bio';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BioLinkEditorProps {
  pageId: string;
  links: BioLinkItem[];
  onLinksChange: (links: BioLinkItem[]) => void;
}

// ---------------------------------------------------------------------------
// Sortable row
// ---------------------------------------------------------------------------

interface SortableRowProps {
  link: BioLinkItem;
  index: number;
  total: number;
  editingId: string | null;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onToggle: (link: BioLinkItem) => void;
  onEdit: (id: string) => void;
  onDelete: (link: BioLinkItem) => void;
  onSaveEdit: (link: BioLinkItem, data: { title: string; url: string; icon: string | null }) => void;
  onCancelEdit: () => void;
}

function SortableRow({
  link,
  index,
  total,
  editingId,
  onMoveUp,
  onMoveDown,
  onToggle,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isEditing = editingId === link.id;

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <BioLinkItemForm
          link={link}
          onSave={(data) => onSaveEdit(link, data)}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-background p-3 transition-shadow',
        isDragging && 'z-10 shadow-lg'
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Reorder arrows */}
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMoveUp(index)}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMoveDown(index)}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Link info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {link.icon && <span className="mr-1">{link.icon}</span>}
          {link.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {truncate(link.url, 40)}
        </p>
      </div>

      {/* Toggle switch */}
      <button
        type="button"
        role="switch"
        aria-checked={link.is_enabled}
        onClick={() => onToggle(link)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
          link.is_enabled ? 'bg-primary' : 'bg-muted-foreground/30'
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
            link.is_enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
          )}
        />
      </button>

      {/* Actions */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onEdit(link.id)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
        onClick={() => onDelete(link)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main editor
// ---------------------------------------------------------------------------

export function BioLinkEditor({ pageId, links, onLinksChange }: BioLinkEditorProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const atLimit = links.length >= BIO_DEFAULTS.MAX_LINKS_PER_PAGE;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // -----------------------------------------------------------------------
  // API helpers
  // -----------------------------------------------------------------------

  const addLink = useCallback(async () => {
    const title = newTitle.trim();
    const url = newUrl.trim();
    if (!title || !url) return;

    setIsAdding(true);
    try {
      const res = await fetch(`/api/bio/${pageId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url }),
      });
      if (!res.ok) throw new Error('Failed to add link');
      const created = await res.json();
      onLinksChange([...links, created as BioLinkItem]);
      setNewTitle('');
      setNewUrl('');
    } catch {
      // TODO: surface error via toast
    } finally {
      setIsAdding(false);
    }
  }, [pageId, links, newTitle, newUrl, onLinksChange]);

  const updateLink = useCallback(
    async (link: BioLinkItem, patch: Partial<BioLinkItem>) => {
      try {
        const res = await fetch(`/api/bio/${pageId}/links/${link.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error('Failed to update link');
        const updated = await res.json();
        onLinksChange(
          links.map((l) => (l.id === link.id ? (updated as BioLinkItem) : l))
        );
      } catch {
        // TODO: surface error via toast
      }
    },
    [pageId, links, onLinksChange]
  );

  const deleteLink = useCallback(
    async (link: BioLinkItem) => {
      try {
        const res = await fetch(`/api/bio/${pageId}/links/${link.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete link');
        onLinksChange(links.filter((l) => l.id !== link.id));
      } catch {
        // TODO: surface error via toast
      }
    },
    [pageId, links, onLinksChange]
  );

  const reorderLinks = useCallback(
    async (reordered: BioLinkItem[]) => {
      onLinksChange(reordered);
      try {
        const res = await fetch(`/api/bio/${pageId}/links/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: reordered.map((l, i) => ({ id: l.id, sort_order: i })),
          }),
        });
        if (!res.ok) throw new Error('Failed to reorder links');
      } catch {
        // TODO: surface error via toast / rollback
      }
    },
    [pageId, onLinksChange]
  );

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = links.findIndex((l) => l.id === active.id);
      const newIndex = links.findIndex((l) => l.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(links, oldIndex, newIndex);
      reorderLinks(reordered);
    },
    [links, reorderLinks]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const reordered = arrayMove(links, index, index - 1);
      reorderLinks(reordered);
    },
    [links, reorderLinks]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= links.length - 1) return;
      const reordered = arrayMove(links, index, index + 1);
      reorderLinks(reordered);
    },
    [links, reorderLinks]
  );

  const handleToggle = useCallback(
    (link: BioLinkItem) => {
      updateLink(link, { is_enabled: !link.is_enabled });
    },
    [updateLink]
  );

  const handleSaveEdit = useCallback(
    (link: BioLinkItem, data: { title: string; url: string; icon: string | null }) => {
      updateLink(link, data);
      setEditingId(null);
    },
    [updateLink]
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLink();
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      {/* Add link form */}
      {!atLimit && (
        <form
          onSubmit={handleAddSubmit}
          className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="new-link-title">Title</Label>
            <Input
              id="new-link-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Link title"
              disabled={isAdding}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="new-link-url">URL</Label>
            <Input
              id="new-link-url"
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={isAdding}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!newTitle.trim() || !newUrl.trim() || isAdding}
            className="shrink-0"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add link
          </Button>
        </form>
      )}

      {atLimit && (
        <p className="text-sm text-muted-foreground">
          Maximum of {BIO_DEFAULTS.MAX_LINKS_PER_PAGE} links reached.
        </p>
      )}

      {/* Link list */}
      {links.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={links.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {links.map((link, index) => (
                <SortableRow
                  key={link.id}
                  link={link}
                  index={index}
                  total={links.length}
                  editingId={editingId}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onToggle={handleToggle}
                  onEdit={setEditingId}
                  onDelete={deleteLink}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingId(null)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {links.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No links yet. Add your first link above.
        </p>
      )}
    </div>
  );
}
