'use client';

import type { BioBlockContentContactForm } from '@/types/bio';

interface ContactFormFormProps {
  content: BioBlockContentContactForm;
  onChange: (content: BioBlockContentContactForm) => void;
}

const REQUIRED_FIELDS = ['name', 'email', 'message'] as const;
const OPTIONAL_FIELDS = [
  { id: 'phone' as const, label: 'Phone number' },
  { id: 'subject' as const, label: 'Subject line' },
];

export function ContactFormForm({ content, onChange }: ContactFormFormProps) {
  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';
  const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground';

  const toggleField = (field: 'phone' | 'subject') => {
    const fields = content.fields ?? ['name', 'email', 'message'];
    const hasField = fields.includes(field);
    const updated = hasField
      ? fields.filter((f) => f !== field)
      : [...fields, field];
    onChange({ ...content, fields: updated });
  };

  const fields = content.fields ?? ['name', 'email', 'message'];

  return (
    <div className="space-y-3">
      {/* Form title */}
      <div>
        <label className={labelClass}>Form title</label>
        <input
          type="text"
          value={content.form_title ?? ''}
          onChange={(e) => onChange({ ...content, form_title: e.target.value })}
          placeholder="Get in touch"
          className={inputClass}
        />
      </div>

      {/* Fields */}
      <div>
        <label className={labelClass}>Fields</label>
        <div className="space-y-1.5">
          {/* Required fields — always checked, disabled */}
          {REQUIRED_FIELDS.map((field) => (
            <label
              key={field}
              className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 opacity-70"
            >
              <input
                type="checkbox"
                checked
                disabled
                className="h-3.5 w-3.5 rounded border-input accent-foreground"
              />
              <span className="text-sm text-foreground capitalize">{field}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">required</span>
            </label>
          ))}

          {/* Optional fields — toggleable */}
          {OPTIONAL_FIELDS.map(({ id, label }) => (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-2 rounded-sm border border-border px-3 py-2 transition-colors hover:bg-secondary/50"
            >
              <input
                type="checkbox"
                checked={fields.includes(id)}
                onChange={() => toggleField(id)}
                className="h-3.5 w-3.5 rounded border-input accent-foreground"
              />
              <span className="text-sm text-foreground">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Success message */}
      <div>
        <label className={labelClass}>Success message</label>
        <input
          type="text"
          value={content.success_message ?? ''}
          onChange={(e) => onChange({ ...content, success_message: e.target.value })}
          placeholder="Thanks! I'll be in touch."
          className={inputClass}
        />
      </div>

      {/* Email notifications toggle */}
      <div className="flex items-center justify-between rounded-sm border border-border px-3 py-2.5">
        <span className="text-sm text-foreground">Email notifications</span>
        <button
          type="button"
          onClick={() => onChange({ ...content, notify_email: !content.notify_email })}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            content.notify_email ? 'bg-foreground' : 'bg-border'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full shadow-sm transition-transform ${
              content.notify_email
                ? 'translate-x-[18px] bg-background'
                : 'translate-x-[3px] bg-muted-foreground'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
