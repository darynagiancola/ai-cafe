import { AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ProductCard } from '../components/menu/ProductCard'
import { AddToCartButton } from '../components/cart/AddToCartButton'
import { QuantitySelector } from '../components/cart/QuantitySelector'
import { SmartImage } from '../components/ui/SmartImage'
import { useCart } from '../context/CartContext'
import { menuService } from '../services/menuService'
import { formatUAH } from '../utils/currency'

export function ProductDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)

  const product = slug ? menuService.getProductBySlug(slug) : undefined
  const relatedProducts = useMemo(
    () => (product ? menuService.getRelatedProducts(product, 3) : []),
    [product],
  )

  if (!product) {
    return (
      <section className="container-shell py-14">
        <div className="card-surface p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-[#8b4f38]" />
          <h1 className="mt-4 text-2xl font-semibold text-[#2a2320]">Product not found</h1>
          <p className="mt-2 text-[#6f635b]">This product may be unavailable or moved.</p>
          <Link
            to="/menu"
            className="focus-ring mt-5 inline-flex rounded-full bg-[#8b4f38] px-5 py-2 text-sm font-medium text-white"
          >
            Back to menu
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="container-shell py-10 sm:py-14">
      <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="card-surface overflow-hidden">
          <SmartImage src={product.image} alt={product.name} className="h-[360px] w-full object-cover sm:h-[460px]" />
        </div>

        <div className="space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#8b4f38]">{product.category}</p>
          <h1 className="display-serif text-5xl leading-[0.95] text-[#2a2320]">{product.name}</h1>
          <p className="text-2xl font-semibold text-[#2a2320]">{formatUAH(product.price)}</p>
          <p className="text-base leading-relaxed text-[#695f58]">{product.longDescription}</p>

          <div className="grid gap-4 rounded-2xl border border-[#e0d2c6] bg-[#fffaf4] p-5">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#534842]">Ingredients</h2>
              <p className="mt-1 text-sm text-[#695f58]">{product.ingredients.join(', ')}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#534842]">Allergens</h2>
              <p className="mt-1 text-sm text-[#695f58]">
                {product.allergens.length > 0 ? product.allergens.join(', ') : 'No listed allergens.'}
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#534842]">Dietary notes</h2>
              <p className="mt-1 text-sm text-[#695f58]">{product.dietaryTags.join(', ') || '—'}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#f1e7dc] px-3 py-2 text-sm text-[#5b4f48]">
              <ShieldCheck className="h-4 w-4" />
              Price is sourced from menu data and calculated deterministically.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <QuantitySelector
              quantity={quantity}
              onDecrease={() => setQuantity((value) => Math.max(1, value - 1))}
              onIncrease={() => setQuantity((value) => value + 1)}
            />
            <AddToCartButton onAdd={() => addToCart(product.id, quantity)} />
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="mt-14">
          <h2 className="text-2xl font-semibold text-[#2a2320]">Related picks</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} onAddToCart={addToCart} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
