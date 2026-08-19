import { MENU_CATEGORIES, type MenuCategoryFilter } from '../../types/menu'

interface MenuFiltersProps {
  selectedCategory: MenuCategoryFilter
  onSelectCategory: (category: MenuCategoryFilter) => void
  searchValue: string
  onSearchChange: (value: string) => void
}

export function MenuFilters({
  selectedCategory,
  onSelectCategory,
  searchValue,
  onSearchChange,
}: MenuFiltersProps) {
  return (
    <section className="card-surface bg-[#fffaf4] p-4 sm:p-6" aria-label="Menu filters">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#4a413c]">Search menu</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search coffee, breakfast, desserts..."
            className="focus-ring w-full rounded-2xl border border-[#dccfc3] bg-white px-4 py-3 text-sm text-[#2a2320] placeholder:text-[#92867b]"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {MENU_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              className={`focus-ring rounded-full px-4 py-2 text-sm transition ${
                selectedCategory === category
                  ? 'bg-[#7f4630] text-white shadow-sm'
                  : 'border border-[#dbcdbf] bg-white text-[#5a4f48] hover:-translate-y-0.5 hover:bg-[#f5ece3]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
