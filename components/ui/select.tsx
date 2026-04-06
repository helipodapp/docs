'use client';

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

type SelectContextValue = {
  value: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onValueChange: (value: string) => void;
};

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = useContext(SelectContext);
  if (!context) throw new Error('Select components must be used within <Select>.');
  return context;
}

export function Select({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const ctx = useMemo(
    () => ({ value, open, setOpen, onValueChange }),
    [value, open, onValueChange],
  );

  return <SelectContext value={ctx}>{children}</SelectContext>;
}

export function SelectTrigger({ className, children }: { className?: string; children: ReactNode }) {
  const { open, setOpen } = useSelectContext();

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-10 w-full items-center justify-between rounded-md border bg-fd-card px-3 text-sm shadow-sm hover:bg-fd-accent/40',
        className,
      )}
      onClick={() => setOpen(!open)}
      aria-expanded={open}
    >
      {children}
      <ChevronDown className="size-4 text-fd-muted-foreground" />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useSelectContext();
  return <span className="truncate">{value || placeholder || ''}</span>;
}

export function SelectContent({ children }: { children: ReactNode }) {
  const { open } = useSelectContext();
  if (!open) return null;

  return (
    <div className="mt-1 max-h-60 overflow-auto rounded-md border bg-fd-popover p-1 text-fd-popover-foreground shadow-md">
      {children}
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: ReactNode }) {
  const { value: currentValue, onValueChange, setOpen } = useSelectContext();
  const selected = currentValue === value;

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm text-left hover:bg-fd-accent hover:text-fd-accent-foreground',
        selected && 'bg-fd-accent text-fd-accent-foreground',
      )}
      onClick={() => {
        onValueChange(value);
        setOpen(false);
      }}
    >
      <span>{children}</span>
      {selected ? <Check className="size-4" /> : null}
    </button>
  );
}
