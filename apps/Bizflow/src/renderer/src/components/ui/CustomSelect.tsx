import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react'; // Make sure to install lucide-react if you haven't

export interface SelectOption {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  /**
   * Control height. `md` is the app default (~50px); `sm` is the dense variant
   * (~36px) used by data-heavy screens, matching the HR module's field scale.
   */
  size?: 'sm' | 'md';
}

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select an option",
  className = "",
  size = 'md'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex !== -1) {
            onChange(options[focusedIndex].value);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, options, onChange]);

  // Reset focused index when opening
  useEffect(() => {
    if (isOpen) {
      const selectedIndex = options.findIndex(opt => opt.value === value);
      setFocusedIndex(selectedIndex);
    }
  }, [isOpen, options, value]);

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && focusedIndex !== -1 && listRef.current) {
      const focusedItem = listRef.current.children[focusedIndex] as HTMLElement;
      focusedItem?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);

  const selectedOption = options.find(opt => opt.value === value);
  const dense = size === 'sm';

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-left bg-white border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] dark:bg-slate-800 dark:text-white ${
          dense ? 'px-3 py-2 text-sm rounded-lg' : 'px-4 py-3 rounded-xl'
        }`}
      >
        <span className={`truncate ${!selectedOption ? 'text-slate-400 dark:text-slate-500' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu with Smooth Animation */}
      {/* Instead of unmounting, we use CSS to animate opacity and scale for a smooth UX */}
      <ul 
        ref={listRef}
        className={`absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg overflow-auto origin-top transition-all duration-200 ease-out ${
          dense ? 'rounded-lg max-h-56' : 'rounded-xl max-h-60'
        } ${
          isOpen 
            ? 'opacity-100 scale-100 pointer-events-auto' 
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {options.map((option, index) => {
          const isSelected = value === option.value;
          const isFocused = focusedIndex === index;
          
          return (
            <li
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              onMouseEnter={() => setFocusedIndex(index)}
              className={`flex items-center justify-between cursor-pointer transition-colors duration-150 ${
                dense ? 'px-3 py-2 text-sm' : 'px-4 py-3'
              } ${
                isSelected 
                  ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent-text)] font-medium' 
                  : isFocused 
                    ? 'bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white'
                    : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="truncate">{option.label}</span>
              {isSelected && <Check className="w-4 h-4 flex-shrink-0 ml-2" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
