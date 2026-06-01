'use client';

interface PluginFiltersProps {
  categories: string[];
  filter: string;
  onFilterChange: (category: string) => void;
}

function formatCategoryLabel(cat: string): string {
  if (cat === 'all') return 'All';
  return cat.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function PluginFilters({ categories, filter, onFilterChange }: PluginFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onFilterChange(cat)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === cat
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          {formatCategoryLabel(cat)}
        </button>
      ))}
    </div>
  );
}
