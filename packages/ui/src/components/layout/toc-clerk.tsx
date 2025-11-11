'use client';
import * as Primitive from 'fumadocs-core/toc';
import { type ComponentProps, type ReactNode, useRef } from 'react';
import { cn } from '@/utils/cn';
import { useTOCItems } from '@/components/layout/toc';
import { mergeRefs } from '@/utils/merge-refs';
import { useI18n } from '@/contexts/i18n';

export default function ClerkTOCItems({
  ref,
  className,
  ...props
}: ComponentProps<'div'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const items = useTOCItems();
  const { text } = useI18n();

  if (items.length === 0)
    return (
      <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
        {text.tocNoHeadings}
      </div>
    );

  return (
    <div
      ref={mergeRefs(containerRef, ref)}
      className={cn('flex flex-col relative', className)}
      {...props}
    >
      {items.map((item, i) => (
        <EnhancedClerkTOCItemInternal
          key={item.url}
          item={item}
          upperDepth={items[i - 1]?.depth}
          lowerDepth={items[i + 1]?.depth}
        />
      ))}
    </div>
  );
}

function getItemOffset(depth: number): number {
  if (depth <= 2) return 14;
  if (depth === 3) return 26;
  return 36;
}

function getLineOffset(depth: number): number {
  return depth >= 3 ? 10 : 0;
}

function getVisualLinePosition(depth: number): number {
  return getLineOffset(depth);
}

function EnhancedClerkTOCItemInternal({
  item,
  upperDepth = item.depth,
  lowerDepth = item.depth,
}: {
  item: Primitive.TOCItemType;
  upperDepth?: number;
  lowerDepth?: number;
}) {
  const isH3 = item.depth === 3;
  const rawTitle = typeof item.title === 'string' ? item.title : '';
  const { isStep, displayStep, content } = getStepInfoFromTitle(rawTitle);
  let stepNumber: string | null = isH3 && isStep ? String(displayStep) : null;
  let resolvedContent: ReactNode = item.title;

  if (isH3 && isStep) {
    resolvedContent = content ?? item.title;
  }

  if (isH3 && !stepNumber) {
    const urlNum = _getDigitsFromUrl(item.url);
    if (urlNum != null) {
      const clamped = Math.max(0, Math.min(19, urlNum));
      stepNumber = String(clamped);
      if (typeof rawTitle === 'string') {
        const m = rawTitle.match(/^(\d+(?:\.\d+)*\.?)\s+(.+)$/);
        if (m && m[2]) {
          resolvedContent = m[2];
        }
      }
    }
  }

  const shouldRenderCircle = isH3 && stepNumber !== null;
  const lineOffsetWithinItem = getLineOffset(item.depth);
  const upperLineOffsetWithinItem = getLineOffset(upperDepth);
  const lowerLineOffsetWithinItem = getLineOffset(lowerDepth);
  const itemPadding = getItemOffset(item.depth);
  const visualElementX = getVisualLinePosition(item.depth);
  const CIRCLE_RADIUS_PX = 7;

  return (
    <Primitive.TOCItem
      href={item.url}
      style={{
        paddingInlineStart: itemPadding,
      }}
      className="prose group relative py-1.5 text-sm text-fd-muted-foreground hover:text-fd-accent-foreground transition-colors [overflow-wrap:anywhere] first:pt-0 last:pb-0 data-[active=true]:text-fd-primary"
    >
      {lineOffsetWithinItem !== upperLineOffsetWithinItem ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          className="absolute -top-1.5 size-4 pointer-events-none rtl:-scale-x-100"
          style={{
            insetInlineStart: Math.min(
              lineOffsetWithinItem,
              upperLineOffsetWithinItem,
            ),
            zIndex: 1,
          }}
        >
          <line
            x1={
              upperLineOffsetWithinItem -
              Math.min(lineOffsetWithinItem, upperLineOffsetWithinItem)
            }
            y1="0"
            x2={
              lineOffsetWithinItem -
              Math.min(lineOffsetWithinItem, upperLineOffsetWithinItem)
            }
            y2="12"
            className={cn(
              'stroke-fd-foreground/10',
              'group-data-[active=true]:stroke-fd-primary',
            )}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
      <div
        className={cn(
          'absolute inset-y-0 pointer-events-none transition-all duration-500 ease-in-out',
          'w-[2px] bg-fd-foreground/15 group-data-[active=true]:bg-fd-primary',
          lineOffsetWithinItem !== upperLineOffsetWithinItem && 'top-1.5',
          lineOffsetWithinItem !== lowerLineOffsetWithinItem && 'bottom-1.5',
        )}
        style={{
          insetInlineStart: lineOffsetWithinItem,
          zIndex: 1,
        }}
      />
      {shouldRenderCircle && stepNumber ? (
        <span
          className={cn(
            'absolute z-10 flex size-[14px] -translate-y-1/2 items-center justify-center rounded-full',
            'bg-black text-white dark:bg-white dark:text-black',
            'group-data-[active=true]:bg-fd-primary group-data-[active=true]:text-white dark:group-data-[active=true]:text-black',
            'font-medium text-xs',
          )}
          style={{
            left: visualElementX - CIRCLE_RADIUS_PX,
            top: '50%',
          }}
        >
          {stepNumber}
        </span>
      ) : null}
      <span style={{ position: 'relative', zIndex: 1 }}>{resolvedContent}</span>
    </Primitive.TOCItem>
  );
}

function _getDigitsFromUrl(url: string): number | null {
  const match = /^#(\d+)-/.exec(url);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? null : value;
}

function getStepInfoFromTitle(
  title: string,
): { isStep: boolean; displayStep: number | null; content: string | null } {
  const trimmed = title.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)*\.?)\s+(.+)$/);
  if (!match) return { isStep: false, displayStep: null, content: null };

  const content = (match[2] ?? '').trim();
  if (content.length === 0) return { isStep: false, displayStep: null, content: null };

  const numericPart = match[1].replace(/\.$/, '');
  const parts = numericPart.split('.').map((part) => Number.parseInt(part, 10));
  const lastPart = parts.at(-1);
  if (lastPart == null || Number.isNaN(lastPart)) {
    return { isStep: false, displayStep: null, content: null };
  }

  const clamped = Math.max(0, Math.min(19, lastPart));
  return { isStep: true, displayStep: clamped, content };
}
