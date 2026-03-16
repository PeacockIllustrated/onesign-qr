/**
 * Starter bio page templates.
 *
 * Each template defines page-level design settings and a set of pre-configured
 * blocks that the user can apply to a new or existing bio page.
 */

import type {
  BioBlockType,
  BioLinkTheme,
  BioCardLayout,
  BioSpacing,
  BioBorderRadius,
} from '@/types/bio';

// ─── Types ──────────────────────────────────────────────────────────

export interface BioTemplateBlock {
  block_type: BioBlockType;
  grid_col: number;
  grid_row: number;
  grid_col_span: number;
  grid_row_span: number;
  content: Record<string, unknown>;
}

export interface BioTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  theme: BioLinkTheme;
  card_layout: BioCardLayout;
  spacing: BioSpacing;
  border_radius: BioBorderRadius;
  font_title: string | null;
  font_body: string | null;
  blocks: BioTemplateBlock[];
}

// ─── Creator ────────────────────────────────────────────────────────

const creator: BioTemplate = {
  id: 'creator',
  name: 'Creator',
  description: 'Perfect for influencers, artists, and musicians.',
  category: 'personal',
  theme: 'gradient-sunset',
  card_layout: 'centered',
  spacing: 'spacious',
  border_radius: 'rounded',
  font_title: 'Playfair Display',
  font_body: 'Inter',
  blocks: [
    {
      block_type: 'heading',
      grid_col: 0,
      grid_row: 0,
      grid_col_span: 4,
      grid_row_span: 1,
      content: { text: "Hey, I'm [Name]", level: 1 },
    },
    {
      block_type: 'social_icons',
      grid_col: 0,
      grid_row: 1,
      grid_col_span: 4,
      grid_row_span: 1,
      content: {
        icons: [
          { platform: 'twitter', url: '' },
          { platform: 'instagram', url: '' },
          { platform: 'youtube', url: '' },
          { platform: 'tiktok', url: '' },
        ],
      },
    },
    {
      block_type: 'youtube_embed',
      grid_col: 0,
      grid_row: 2,
      grid_col_span: 4,
      grid_row_span: 2,
      content: { video_url: '' },
    },
    {
      block_type: 'spotify_embed',
      grid_col: 0,
      grid_row: 4,
      grid_col_span: 4,
      grid_row_span: 1,
      content: { spotify_url: '', embed_type: 'track' },
    },
    {
      block_type: 'link',
      grid_col: 0,
      grid_row: 5,
      grid_col_span: 4,
      grid_row_span: 1,
      content: { title: 'My latest project', url: '' },
    },
    {
      block_type: 'payment_link',
      grid_col: 0,
      grid_row: 6,
      grid_col_span: 4,
      grid_row_span: 1,
      content: {
        platform: 'buymeacoffee',
        url: 'https://buymeacoffee.com/',
        display_text: 'Support my work',
      },
    },
  ],
};

// ─── Business ───────────────────────────────────────────────────────

const business: BioTemplate = {
  id: 'business',
  name: 'Business',
  description: 'Great for small businesses and freelancers.',
  category: 'professional',
  theme: 'minimal',
  card_layout: 'left-aligned',
  spacing: 'normal',
  border_radius: 'soft',
  font_title: null,
  font_body: null,
  blocks: [
    {
      block_type: 'heading',
      grid_col: 0,
      grid_row: 0,
      grid_col_span: 4,
      grid_row_span: 1,
      content: { text: 'Welcome', level: 1 },
    },
    {
      block_type: 'text',
      grid_col: 0,
      grid_row: 1,
      grid_col_span: 4,
      grid_row_span: 1,
      content: {
        text: 'We help businesses grow with expert solutions.',
        align: 'center',
      },
    },
    {
      block_type: 'link',
      grid_col: 0,
      grid_row: 2,
      grid_col_span: 4,
      grid_row_span: 1,
      content: { title: 'Our Services', url: '' },
    },
    {
      block_type: 'link',
      grid_col: 0,
      grid_row: 3,
      grid_col_span: 4,
      grid_row_span: 1,
      content: { title: 'Book an Appointment', url: '' },
    },
    {
      block_type: 'link',
      grid_col: 0,
      grid_row: 4,
      grid_col_span: 4,
      grid_row_span: 1,
      content: { title: 'Reviews', url: '' },
    },
    {
      block_type: 'contact_form',
      grid_col: 0,
      grid_row: 5,
      grid_col_span: 4,
      grid_row_span: 2,
      content: {
        form_title: 'Get in touch',
        fields: ['name', 'email', 'message', 'phone'],
      },
    },
    {
      block_type: 'map',
      grid_col: 0,
      grid_row: 7,
      grid_col_span: 4,
      grid_row_span: 2,
      content: { query: '' },
    },
    {
      block_type: 'social_icons',
      grid_col: 0,
      grid_row: 9,
      grid_col_span: 4,
      grid_row_span: 1,
      content: {
        icons: [
          { platform: 'twitter', url: '' },
          { platform: 'instagram', url: '' },
          { platform: 'linkedin', url: '' },
          { platform: 'facebook', url: '' },
        ],
      },
    },
  ],
};

// ─── Event ──────────────────────────────────────────────────────────

const event: BioTemplate = {
  id: 'event',
  name: 'Event',
  description: 'Ideal for conferences, meetups, and launches.',
  category: 'event',
  theme: 'bold',
  card_layout: 'split',
  spacing: 'normal',
  border_radius: 'rounded',
  font_title: 'Space Grotesk',
  font_body: 'Inter',
  blocks: [
    {
      block_type: 'heading',
      grid_col: 0,
      grid_row: 0,
      grid_col_span: 4,
      grid_row_span: 1,
      content: { text: 'Event Name', level: 1 },
    },
    {
      block_type: 'countdown',
      grid_col: 0,
      grid_row: 1,
      grid_col_span: 4,
      grid_row_span: 2,
      content: {
        target_datetime: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        label: 'Starts in',
        style: 'large',
      },
    },
    {
      block_type: 'text',
      grid_col: 0,
      grid_row: 3,
      grid_col_span: 4,
      grid_row_span: 1,
      content: {
        text: 'Join us for an unforgettable experience.',
        align: 'center',
      },
    },
    {
      block_type: 'link',
      grid_col: 0,
      grid_row: 4,
      grid_col_span: 4,
      grid_row_span: 1,
      content: { title: 'Get Tickets', url: '' },
    },
    {
      block_type: 'map',
      grid_col: 0,
      grid_row: 5,
      grid_col_span: 4,
      grid_row_span: 2,
      content: { query: '' },
    },
    {
      block_type: 'gallery',
      grid_col: 0,
      grid_row: 7,
      grid_col_span: 4,
      grid_row_span: 2,
      content: { display_mode: 'grid', columns: 2, images: [] },
    },
    {
      block_type: 'social_icons',
      grid_col: 0,
      grid_row: 9,
      grid_col_span: 4,
      grid_row_span: 1,
      content: {
        icons: [
          { platform: 'twitter', url: '' },
          { platform: 'instagram', url: '' },
        ],
      },
    },
  ],
};

// ─── Portfolio ──────────────────────────────────────────────────────

const portfolio: BioTemplate = {
  id: 'portfolio',
  name: 'Portfolio',
  description: 'Showcase your work as a designer, photographer, or developer.',
  category: 'creative',
  theme: 'glass',
  card_layout: 'minimal',
  spacing: 'compact',
  border_radius: 'soft',
  font_title: 'Sora',
  font_body: 'Inter',
  blocks: [
    {
      block_type: 'heading',
      grid_col: 0,
      grid_row: 0,
      grid_col_span: 4,
      grid_row_span: 1,
      content: { text: 'My Work', level: 1 },
    },
    {
      block_type: 'gallery',
      grid_col: 0,
      grid_row: 1,
      grid_col_span: 4,
      grid_row_span: 2,
      content: { display_mode: 'grid', columns: 3, images: [] },
    },
    {
      block_type: 'text',
      grid_col: 0,
      grid_row: 3,
      grid_col_span: 4,
      grid_row_span: 1,
      content: {
        text: 'Designer & developer crafting digital experiences.',
        align: 'center',
      },
    },
    {
      block_type: 'link',
      grid_col: 0,
      grid_row: 4,
      grid_col_span: 2,
      grid_row_span: 1,
      content: { title: 'Resume', url: '' },
    },
    {
      block_type: 'link',
      grid_col: 2,
      grid_row: 4,
      grid_col_span: 2,
      grid_row_span: 1,
      content: { title: 'Hire Me', url: '' },
    },
    {
      block_type: 'social_icons',
      grid_col: 0,
      grid_row: 5,
      grid_col_span: 4,
      grid_row_span: 1,
      content: {
        icons: [
          { platform: 'github', url: '' },
          { platform: 'linkedin', url: '' },
          { platform: 'twitter', url: '' },
        ],
      },
    },
    {
      block_type: 'contact_form',
      grid_col: 0,
      grid_row: 6,
      grid_col_span: 4,
      grid_row_span: 2,
      content: {
        form_title: "Let's work together",
        fields: ['name', 'email', 'message'],
      },
    },
  ],
};

// ─── Exports ────────────────────────────────────────────────────────

export const BIO_TEMPLATES_LIST: BioTemplate[] = [
  creator,
  business,
  event,
  portfolio,
];

export const BIO_TEMPLATES_MAP: Record<string, BioTemplate> = {
  creator,
  business,
  event,
  portfolio,
};
