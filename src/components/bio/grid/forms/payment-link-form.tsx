'use client';

import type { BioBlockContentPaymentLink } from '@/types/bio';

interface PaymentLinkFormProps {
  content: BioBlockContentPaymentLink;
  onChange: (content: BioBlockContentPaymentLink) => void;
}

const PLATFORM_PLACEHOLDERS: Record<BioBlockContentPaymentLink['platform'], string> = {
  paypal: 'Send via PayPal',
  venmo: 'Send via Venmo',
  cashapp: 'Send via Cash App',
  stripe: 'Pay with Stripe',
  buymeacoffee: 'Buy me a coffee',
  'ko-fi': 'Support on Ko-fi',
  custom: 'Support my work',
};

export function PaymentLinkForm({ content, onChange }: PaymentLinkFormProps) {
  const handleAmountsChange = (raw: string) => {
    const amounts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.slice(0, 20))
      .slice(0, 5);
    onChange({ ...content, suggested_amounts: amounts });
  };

  return (
    <div className="space-y-3">
      {/* Platform */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Platform
        </label>
        <select
          value={content.platform}
          onChange={(e) =>
            onChange({
              ...content,
              platform: e.target.value as BioBlockContentPaymentLink['platform'],
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="paypal">PayPal</option>
          <option value="venmo">Venmo</option>
          <option value="cashapp">Cash App</option>
          <option value="stripe">Stripe</option>
          <option value="buymeacoffee">Buy Me a Coffee</option>
          <option value="ko-fi">Ko-fi</option>
          <option value="custom">Custom Link</option>
        </select>
      </div>

      {/* Payment URL */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Payment URL
        </label>
        <input
          type="url"
          value={content.url}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
          placeholder="https://..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Button text */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Button text
        </label>
        <input
          type="text"
          value={content.display_text ?? ''}
          onChange={(e) => onChange({ ...content, display_text: e.target.value })}
          placeholder={PLATFORM_PLACEHOLDERS[content.platform]}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Suggested amounts */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Suggested amounts
        </label>
        <input
          type="text"
          value={(content.suggested_amounts ?? []).join(', ')}
          onChange={(e) => handleAmountsChange(e.target.value)}
          placeholder="$5, $10, $25"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Display only. Max 5, each max 20 chars.
        </p>
      </div>
    </div>
  );
}
