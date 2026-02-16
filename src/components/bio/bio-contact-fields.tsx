'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BioContactFieldsProps {
  subtitle: string;
  company: string;
  jobTitle: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  contactWebsite: string;
  onChange: (field: string, value: string) => void;
}

export function BioContactFields({
  subtitle,
  company,
  jobTitle,
  location,
  contactEmail,
  contactPhone,
  contactWebsite,
  onChange,
}: BioContactFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Subtitle - full width */}
      <div className="col-span-2 space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Subtitle
        </Label>
        <Input
          value={subtitle}
          onChange={(e) => onChange('subtitle', e.target.value)}
          placeholder="Designer, dreamer, coffee lover..."
          maxLength={150}
        />
      </div>

      {/* Company - half width */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Company
        </Label>
        <Input
          value={company}
          onChange={(e) => onChange('company', e.target.value)}
          maxLength={100}
        />
      </div>

      {/* Job Title - half width */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Job Title
        </Label>
        <Input
          value={jobTitle}
          onChange={(e) => onChange('jobTitle', e.target.value)}
          maxLength={100}
        />
      </div>

      {/* Location - full width */}
      <div className="col-span-2 space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Location
        </Label>
        <Input
          value={location}
          onChange={(e) => onChange('location', e.target.value)}
          placeholder="San Francisco, CA"
          maxLength={100}
        />
      </div>

      {/* Email - half width */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Email
        </Label>
        <Input
          type="email"
          value={contactEmail}
          onChange={(e) => onChange('contactEmail', e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Phone - half width */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Phone
        </Label>
        <Input
          type="tel"
          value={contactPhone}
          onChange={(e) => onChange('contactPhone', e.target.value)}
          maxLength={50}
        />
      </div>

      {/* Website - full width */}
      <div className="col-span-2 space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Website
        </Label>
        <Input
          type="url"
          value={contactWebsite}
          onChange={(e) => onChange('contactWebsite', e.target.value)}
          placeholder="https://yoursite.com"
          maxLength={2048}
        />
      </div>
    </div>
  );
}
