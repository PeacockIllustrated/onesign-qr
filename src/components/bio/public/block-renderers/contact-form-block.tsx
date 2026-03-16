'use client';

import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import type { BioBlockContentContactForm, BioThemeConfig } from '@/types/bio';

interface PublicContactFormBlockProps {
  content: BioBlockContentContactForm;
  themeConfig: BioThemeConfig;
  blockId: string;
  pageId: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  message: 'Message',
  phone: 'Phone',
  subject: 'Subject',
};

export function PublicContactFormBlock({
  content,
  themeConfig,
  blockId,
  pageId,
}: PublicContactFormBlockProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const { colors, borderRadius } = themeConfig;
  const fields = content.fields ?? ['name', 'email', 'message'];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.message?.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length > 2000) {
      newErrors.message = 'Message must be under 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch(`/api/bio/${pageId}/form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_id: blockId,
          name: formData.name?.trim(),
          email: formData.email?.trim(),
          message: formData.message?.trim(),
          ...(formData.phone?.trim() ? { phone: formData.phone.trim() } : {}),
          ...(formData.subject?.trim() ? { subject: formData.subject.trim() } : {}),
        }),
      });

      if (res.status === 429) {
        setStatus('error');
        setErrorMessage('Too many submissions. Please try again later.');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const inputStyle: React.CSSProperties = {
    borderRadius,
    borderColor: `${colors.text}20`,
    backgroundColor: 'transparent',
    color: colors.text,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  };

  const inputFocusRing = `0 0 0 2px ${colors.accent}40`;

  // Success state
  if (status === 'success') {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 py-6"
        style={{
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        <CheckCircle
          className="h-8 w-8"
          style={{ color: colors.accent }}
        />
        <p
          className="text-center text-sm font-medium"
          style={{ color: colors.accent }}
        >
          {content.success_message || "Thanks! I'll be in touch."}
        </p>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full w-full flex-col gap-3 px-4 py-4"
      noValidate
    >
      {/* Form title */}
      {content.form_title && (
        <h3
          className="text-base font-semibold"
          style={{ color: colors.text }}
        >
          {content.form_title}
        </h3>
      )}

      {/* Fields */}
      {fields.map((field) => {
        const isTextarea = field === 'message';
        const hasError = !!errors[field];

        const fieldInputStyle: React.CSSProperties = {
          ...inputStyle,
          ...(hasError ? { borderColor: '#ef4444' } : {}),
        };

        return (
          <div key={field} className="flex flex-col gap-1">
            <label
              className="text-xs font-medium"
              style={{ color: colors.textSecondary }}
            >
              {FIELD_LABELS[field]}
            </label>
            {isTextarea ? (
              <textarea
                value={formData[field] ?? ''}
                onChange={(e) => updateField(field, e.target.value)}
                rows={3}
                className="w-full resize-none border px-3 py-2 text-sm outline-none placeholder:opacity-40"
                style={fieldInputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = inputFocusRing;
                  e.currentTarget.style.borderColor = colors.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = hasError ? '#ef4444' : `${colors.text}20`;
                }}
                placeholder={`Your ${field}...`}
              />
            ) : (
              <input
                type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                value={formData[field] ?? ''}
                onChange={(e) => updateField(field, e.target.value)}
                className="w-full border px-3 py-2 text-sm outline-none placeholder:opacity-40"
                style={fieldInputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = inputFocusRing;
                  e.currentTarget.style.borderColor = colors.accent;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = hasError ? '#ef4444' : `${colors.text}20`;
                }}
                placeholder={`Your ${field}...`}
              />
            )}
            {hasError && (
              <span className="text-xs" style={{ color: '#ef4444' }}>
                {errors[field]}
              </span>
            )}
          </div>
        );
      })}

      {/* Error message */}
      {status === 'error' && errorMessage && (
        <p className="text-xs" style={{ color: '#ef4444' }}>
          {errorMessage}
        </p>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
        style={{
          backgroundColor: colors.accent,
          color: colors.buttonText,
          borderRadius,
        }}
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Message'
        )}
      </button>
    </form>
  );
}
