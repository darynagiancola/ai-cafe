import { Leaf } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MenuProduct } from '../../types/menu'
import { formatUAH } from '../../utils/currency'
import { AddToCartButton } from '../cart/AddToCartButton'
import { SmartImage } from '../ui/SmartImage'

interface ProductCardProps {
  product: MenuProduct
  onAddToCart: (productId: string) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <article className="card-surface group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_48px_-22px_rgba(31,26,23,0.45)]">
      <Link className="relative block overflow-hidden" to={`/menu/${product.slug}`}>
        <SmartImage
          src={product.image}
          alt={product.name}
          className="h-64 w-full object-cover transition duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
        <p className="absolute left-4 top-4 rounded-full bg-[#fffaf4]/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5d473a] shadow-sm">
          {product.category}
        </p>
      </Link>

      <div className="flex flex-1 flex-col space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold tracking-tight text-[#2a2320]">{product.name}</h3>
            <p className="line-clamp-2 text-sm leading-relaxed text-[#5c5148]">{product.description}</p>
          </div>
          <p className="rounded-full bg-[#f2e5d9] px-3 py-1.5 text-sm font-semibold text-[#3d312a]">{formatUAH(product.price)}</p>
        </div>

        <div className="mt-auto space-y-3">
          {product.badges && product.badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 rounded-full border border-[#dfd0c2] bg-[#faf2e9] px-2.5 py-1 text-xs font-medium text-[#634e42]"
                >
                  {badge === 'Vegan' && <Leaf className="h-3 w-3" aria-hidden />}
                  {badge}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <AddToCartButton onAdd={() => onAddToCart(product.id)} className="w-full" />
            <Link className="btn-secondary px-4" to={`/menu/${product.slug}`}>
              Details
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
