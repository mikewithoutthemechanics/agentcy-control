'use client';

import * as React from 'react';

interface DropdownItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  destructive?: boolean;
}

interface DropdownDivider {
  type: 'divider';
}

type DropdownOption = DropdownItem | DropdownDivider;

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownOption[];
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  align = 'left',
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignment = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`absolute ${alignment} z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg py-1`}
          role="menu"
        >
          {items.map((item, index) => {
            if ('type' in item && item.type === 'divider') {
              return (
                <div
                  key={`divider-${index}`}
                  className="my-1 border-t border-slate-100"
                />
              );
            }

            const dropdownItem = item as DropdownItem;
            return (
              <button
                key={dropdownItem.label + index}
                onClick={() => {
                  if (!dropdownItem.disabled) {
                    dropdownItem.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={dropdownItem.disabled}
                role="menuitem"
                className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-left transition-colors ${
                  dropdownItem.disabled
                    ? 'text-slate-400 cursor-not-allowed'
                    : dropdownItem.destructive
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {dropdownItem.icon && (
                  <span className="flex-shrink-0">{dropdownItem.icon}</span>
                )}
                {dropdownItem.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
