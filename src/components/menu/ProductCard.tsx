import { Leaf } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MenuProduct } from '../../types/menu'
import { formatUAH } from '../../utils/currency'

interface ProductCardProps {
  product: MenuProduct
  onAddToCart: (productId: string) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <article className="card-surface overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <Link className="block overflow-hidden" to={`/menu/${product.slug}`}>
        <img
          src={product.image}
          alt={product.name}
          className="h-52 w-full object-cover transition duration-500 hover:scale-105"
          loading="lazy"
        />
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#8a7d73]">{product.category}</p>
            <h3 className="mt-1 text-lg font-semibold text-[#2a2320]">{product.name}</h3>
          </div>
          <p className="text-lg font-semibold text-[#2a2320]">{formatUAH(product.price)}</p>
        </div>
        <p className="line-clamp-2 text-sm text-[#695f58]">{product.description}</p>

        {product.badges && product.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {product.badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1 rounded-full border border-[#e3d5ca] bg-[#f5ece3] px-2.5 py-1 text-xs text-[#6e5549]"
              >
                {badge === 'Vegan' && <Leaf className="h-3 w-3" aria-hidden />}
                {badge}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddToCart(product.id)}
            className="focus-ring w-full rounded-full bg-[#8b4f38] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#75412d]"
          >
            Add to cart
          </button>
          <Link
            className="focus-ring rounded-full border border-[#dbcdbf] px-4 py-2 text-sm text-[#4e453f] transition hover:bg-[#f5ece3]"
            to={`/menu/${product.slug}`}
          >
            Details
          </Link>
        </div>
      </div>
    </article>
  )
}
