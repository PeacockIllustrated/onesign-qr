'use client';

import type { BioBlockContentCountdown } from '@/types/bio';

interface CountdownFormProps {
  content: BioBlockContentCountdown;
  onChange: (content: BioBlockContentCountdown) => void;
}

/**
 * Converts an ISO date string to a datetime-local input value (YYYY-MM-DDTHH:mm).
 * Returns empty string if the input is falsy.
 */
function isoToDatetimeLocal(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    // Format as YYYY-MM-DDTHH:mm in local time
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      'T' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes())
    );
  } catch {
    return '';
  }
}

/**
 * Converts a datetime-local input value to an ISO string.
 * Returns empty string if the input is empty.
 */
function datetimeLocalToIso(value: string): string {
  if (!value) return '';
  try {
    return new Date(value).toISOString();
  } catch {
    return '';
  }
}

export function CountdownForm({ content, onChange }: CountdownFormProps) {
  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';
  const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground';

  return (
    <div className="space-y-3">
      {/* Target date & time */}
      <div>
        <label className={labelClass}>Target date &amp; time</label>
        <input
          type="datetime-local"
          value={isoToDatetimeLocal(content.target_datetime)}
          onChange={(e) =>
            onChange({ ...content, target_datetime: datetimeLocalToIso(e.target.value) })
          }
          className={inputClass}
        />
      </div>

      {/* Label */}
      <div>
        <label className={labelClass}>Label</label>
        <input
          type="text"
          value={content.label ?? ''}
          onChange={(e) => onChange({ ...content, label: e.target.value })}
          placeholder="Countdown"
          className={inputClass}
        />
      </div>

      {/* Expired message */}
      <div>
        <label className={labelClass}>Expired message</label>
        <input
          type="text"
          value={content.expired_message ?? ''}
          onChange={(e) => onChange({ ...content, expired_message: e.target.value })}
          placeholder="We're live!"
          className={inputClass}
        />
      </div>

      {/* Style */}
      <div>
        <label className={labelClass}>Style</label>
        <select
          value={content.style ?? 'large'}
          onChange={(e) =>
            onChange({
              ...content,
              style: e.target.value as BioBlockContentCountdown['style'],
            })
          }
          className={inputClass}
        >
          <option value="large">Large (boxes)</option>
          <option value="compact">Compact (single line)</option>
        </select>
      </div>
    </div>
  );
}
