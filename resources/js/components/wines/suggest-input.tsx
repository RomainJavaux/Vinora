import { History } from 'lucide-react';
import type { ComponentProps, KeyboardEvent } from 'react';
import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { normalize } from '@/lib/search';
import { cn } from '@/lib/utils';

export type Suggestion = {
    value: string;
    /** Small grey text on the right: « Bourgogne · 3 vins ». */
    hint?: string | null;
};

type Props = Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
    value: string;
    onChange: (value: string) => void;
    suggestions: Suggestion[];
    /** Called when a suggestion is picked (to fill other fields). */
    onPick?: (suggestion: Suggestion) => void;
    /** Shown above the list while nothing is typed. */
    title?: string;
    limit?: number;
};

/**
 * A text field that suggests what was already typed elsewhere in the
 * cellar: accent and case insensitive, best matches first, usable with the
 * keyboard (↑ ↓ Entrée Échap).
 */
export function SuggestInput({
    value,
    onChange,
    suggestions,
    onPick,
    title,
    limit = 6,
    onKeyDown,
    onFocus,
    onBlur,
    className,
    ...props
}: Props) {
    const id = useId();
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const query = normalize(value);

    const matches = (
        query === ''
            ? suggestions
            : suggestions
                  .filter((suggestion) => {
                      const text = normalize(suggestion.value);

                      return text.includes(query) && text !== query;
                  })
                  .sort(
                      (a, b) =>
                          Number(!normalize(a.value).startsWith(query)) -
                          Number(!normalize(b.value).startsWith(query)),
                  )
    ).slice(0, limit);

    const visible = open && matches.length > 0;

    const pick = (suggestion: Suggestion) => {
        onChange(suggestion.value);
        onPick?.(suggestion);
        setOpen(false);
        setActive(-1);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' && matches.length > 0) {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, matches.length - 1));

            return;
        }

        if (event.key === 'ArrowUp' && visible) {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, -1));

            return;
        }

        if (event.key === 'Enter' && visible && active >= 0) {
            event.preventDefault();
            pick(matches[active]);

            return;
        }

        if (event.key === 'Escape' && visible) {
            event.preventDefault();
            setOpen(false);

            return;
        }

        onKeyDown?.(event);
    };

    return (
        <div className="relative">
            <Input
                {...props}
                value={value}
                onChange={(event) => {
                    onChange(event.target.value);
                    setOpen(true);
                    setActive(-1);
                }}
                onFocus={(event) => {
                    setOpen(true);
                    onFocus?.(event);
                }}
                onBlur={(event) => {
                    setOpen(false);
                    setActive(-1);
                    onBlur?.(event);
                }}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={visible}
                aria-controls={`${id}-list`}
                aria-activedescendant={
                    visible && active >= 0 ? `${id}-${active}` : undefined
                }
                autoComplete="off"
                className={className}
            />
            {visible && (
                <div
                    className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-float"
                    // Keep the focus in the field while clicking a suggestion.
                    onMouseDown={(event) => event.preventDefault()}
                >
                    {title && query === '' && (
                        <p className="flex items-center gap-1.5 px-3 pt-1.5 pb-1 text-[12px] font-semibold text-muted-foreground">
                            <History className="size-3.5" />
                            {title}
                        </p>
                    )}
                    <ul id={`${id}-list`} role="listbox">
                        {matches.map((suggestion, index) => (
                            <li
                                key={suggestion.value}
                                id={`${id}-${index}`}
                                role="option"
                                aria-selected={index === active}
                                onClick={() => pick(suggestion)}
                                onMouseEnter={() => setActive(index)}
                                className={cn(
                                    'flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-[15px]',
                                    index === active && 'bg-accent',
                                )}
                            >
                                <span className="min-w-0 truncate font-semibold">
                                    {suggestion.value}
                                </span>
                                {suggestion.hint && (
                                    <span className="shrink-0 text-[12px] text-muted-foreground">
                                        {suggestion.hint}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
