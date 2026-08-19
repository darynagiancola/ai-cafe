import { useMemo, useState } from 'react'
import { MenuFilters } from '../components/menu/MenuFilters'
import { ProductCard } from '../components/menu/ProductCard'
import { SectionHeading } from '../components/ui/SectionHeading'
import { useCart } from '../context/CartContext'
import { menuService } from '../services/menuService'
import type { MenuCategoryFilter } from '../types/menu'

export function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState<MenuCategoryFilter>('All')
  const [searchValue, setSearchValue] = useState('')
  const { addToCart } = useCart()

  const products = useMemo(
    () => menuService.queryProducts({ category: selectedCategory, search: searchValue }),
    [selectedCategory, searchValue],
  )

  return (
    <section className="container-shell py-10 sm:py-14">
      <SectionHeading
        eyebrow="Menu"
        title="Curated specialty menu"
        description="From espresso classics to modern brunch favorites, crafted fresh throughout the day."
      />
      <div className="mt-8">
        <MenuFilters
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />
      </div>

      <div className="mt-8">
        {products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
            ))}
          </div>
        ) : (
          <div className="card-surface p-10 text-center">
            <h3 className="text-xl font-semibold text-[#2a2320]">No products found</h3>
            <p className="mt-2 text-[#6f635b]">Try another search term or switch category filters.</p>
          </div>
        )}
      </div>
    </section>
  )
}
