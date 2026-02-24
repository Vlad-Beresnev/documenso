import { colord } from 'colord';
import { once } from 'remeda';

export const DEFAULT_RECT_BACKGROUND = 'rgba(255, 255, 255, 0.95)';

export type RecipientColorStyles = {
  base: string;
  baseRing: string;
  baseRingHover: string;
  baseTextHover: string;
  fieldButton: string;
  fieldButtonText: string;
  fieldItem: string;
  fieldItemInitials: string;
  comboBoxTrigger: string;
  comboBoxItem: string;
};

const CSS_PROPERTY = {
  bg: 'bg',
  border: 'border',
  ring: 'ring',
  text: 'text',
};

const CSS_VARIANT = {
  active: 'active',
  groupHover: 'group-hover',
  groupHoverFieldItem: 'group-hover/field-item',
  hover: 'hover',
};

export const AVAILABLE_RECIPIENT_COLORS = ['green', 'blue', 'purple', 'orange', 'yellow', 'pink'] as const;

export type TRecipientColor = 'readOnly' | (typeof AVAILABLE_RECIPIENT_COLORS)[number];

export const RECIPIENT_DYNAMIC_CLASS = {
  pattern: new RegExp(
    `(${Object.values(CSS_PROPERTY).join('|')})-recipient-(${AVAILABLE_RECIPIENT_COLORS.join('|')})(\\/(15|30))?$`,
  ),
  variants: Object.values(CSS_VARIANT),
};

const generateStyles = (recipientColor: (typeof AVAILABLE_RECIPIENT_COLORS)[number]): RecipientColorStyles => {
  const { bg, border, ring, text } = CSS_PROPERTY;
  const { active, hover, groupHover, groupHoverFieldItem } = CSS_VARIANT;

  const name = `recipient-${recipientColor}`;
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`);
  const color = colord(`hsl(${value})`);

  return {
    base: `${ring}-${name} ${hover}:${bg}-${name}/30`,
    baseRing: color.toRgbString(),
    baseRingHover: color.alpha(0.3).toRgbString(),
    baseTextHover: color.toRgbString(),
    fieldButton: `${hover}:${border}-${name} ${hover}:${bg}-${name}/30`,
    fieldButtonText: `${groupHover}:${text}-${name}`,
    fieldItem: 'group/field-item rounded-[2px]',
    fieldItemInitials: `${groupHoverFieldItem}:${bg}-${name}`,
    comboBoxTrigger: `ring-2 ${ring}-${name} ${hover}:${bg}-${name}/15 ${active}:${bg}-${name}/15 shadow-[0_0_0_5px_hsl(var(--${name})/10%),0_0_0_2px_hsl(var(--${name})/60%),0_0_0_0.5px_hsl(var(--${name}))]`,
    comboBoxItem: `${hover}:${bg}-${name}/15 ${active}:${bg}-${name}/15`,
  };
};

const RECIPIENT_COLOR_STYLES = Object.fromEntries(
  AVAILABLE_RECIPIENT_COLORS.map((color) => [color, once(() => generateStyles(color))]),
) as Record<(typeof AVAILABLE_RECIPIENT_COLORS)[number], () => RecipientColorStyles>;

const READ_ONLY_STYLES: RecipientColorStyles = {
  base: 'ring-neutral-400',
  baseRing: 'rgba(176, 176, 176, 1)',
  baseRingHover: 'rgba(176, 176, 176, 1)',
  baseTextHover: 'rgba(176, 176, 176, 1)',
  fieldButton: 'border-neutral-400 hover:border-neutral-400',
  fieldButtonText: '',
  fieldItem: 'group/field-item rounded-[2px]',
  fieldItemInitials: '',
  comboBoxTrigger:
    'ring-2 ring-neutral-400 shadow-[0_0_0_5px_hsl(var(--neutral-400)/10%),0_0_0_2px_hsl(var(--neutral-400)/60%),0_0_0_0.5px_hsl(var(--neutral-400))]',
  comboBoxItem: '',
};

export const getRecipientColor = (index: number) => {
  return AVAILABLE_RECIPIENT_COLORS[Math.max(index, 0) % AVAILABLE_RECIPIENT_COLORS.length];
};

export const getRecipientColorStyles = (colorOrIndex: TRecipientColor | number): RecipientColorStyles => {
  const color = typeof colorOrIndex === 'number' ? getRecipientColor(colorOrIndex) : colorOrIndex;

  if (color === 'readOnly') {
    return READ_ONLY_STYLES;
  }

  return RECIPIENT_COLOR_STYLES[color]();
};

export const useRecipientColors = (index: number) => {
  return getRecipientColorStyles(index);
};
