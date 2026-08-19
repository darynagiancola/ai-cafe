import { ArrowRight, Coffee, Leaf, Sparkles, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AIBaristaModal } from '../components/ai/AIBaristaModal'
import { ProductCard } from '../components/menu/ProductCard'
import { SectionHeading } from '../components/ui/SectionHeading'
import { SmartImage } from '../components/ui/SmartImage'
import { useCart } from '../context/CartContext'
import { businessService } from '../services/businessService'
import { menuService } from '../services/menuService'
import { formatUAH } from '../utils/currency'

export function HomePage() {
  const featuredProducts = menuService.getFeaturedProducts(6)
  const leadProduct = featuredProducts[0]
  const secondaryProducts = featuredProducts.slice(1)
  const seasonalProduct = menuService.getAllProducts().find((product) => product.badges?.includes('New'))
  const { addToCart } = useCart()
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const businessInfo = businessService.getBusinessInfo()

  return (
    <>
      <section className="container-shell py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="relative rounded-[2rem] border border-[#dfd0c1] bg-[#fff8ee] p-7 shadow-[0_14px_38px_-25px_rgba(31,26,23,0.45)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b5339]">Modern specialty coffee</p>
            <h1 className="display-serif mt-4 text-5xl leading-[0.96] text-[#241d19] sm:text-6xl lg:text-7xl">
              Crafted mornings, served with quiet city elegance.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5f534b] sm:text-lg">
              Order premium coffee, seasonal brunch, and refined desserts online from {businessInfo.logoWordmark}. Pickup and delivery
              built for modern daily rituals.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/menu" className="btn-primary">
                Order now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/menu" className="btn-secondary">
                Explore menu
              </Link>
            </div>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f4e8db] p-3">
                <p className="text-xs uppercase tracking-wide text-[#71574a]">Beans</p>
                <p className="mt-1 text-sm font-semibold text-[#2f2520]">Specialty micro-lots</p>
              </div>
              <div className="rounded-2xl bg-[#f4e8db] p-3">
                <p className="text-xs uppercase tracking-wide text-[#71574a]">Kitchen</p>
                <p className="mt-1 text-sm font-semibold text-[#2f2520]">Prepared fresh daily</p>
              </div>
              <div className="rounded-2xl bg-[#f4e8db] p-3">
                <p className="text-xs uppercase tracking-wide text-[#71574a]">Online</p>
                <p className="mt-1 text-sm font-semibold text-[#2f2520]">Pickup + delivery</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[#ddcebf] shadow-[0_18px_40px_-24px_rgba(31,26,23,0.5)]">
            <SmartImage
              src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1400&q=80"
              alt="Barista preparing specialty coffee at AURELIA café"
              className="h-[420px] w-full object-cover sm:h-[520px]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#151210]/85 via-[#151210]/30 to-transparent p-6 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-[#eedfcd]">AURELIA signature experience</p>
              <p className="mt-2 max-w-sm text-base font-medium text-[#f9f2ea]">
                Intentional brewing, warm hospitality, and thoughtful flavor in every cup.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Featured menu"
            title="Our most-loved picks"
            description="A curated selection of house favorites, from velvety coffee signatures to elegant sweets."
          />
          <Link className="btn-secondary" to="/menu">
            See full menu
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {leadProduct && (
            <article className="card-surface group overflow-hidden lg:col-span-2">
              <div className="grid md:grid-cols-[1.05fr_0.95fr]">
                <Link className="relative block overflow-hidden" to={`/menu/${leadProduct.slug}`}>
                  <SmartImage
                    src={leadProduct.image}
                    alt={leadProduct.name}
                    className="h-72 w-full object-cover transition duration-700 group-hover:scale-105 md:h-full"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
                </Link>
                <div className="flex flex-col justify-between p-6 sm:p-7">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#8b5339]">House favorite</p>
                    <h3 className="display-serif mt-2 text-4xl leading-[0.95] text-[#241d19]">{leadProduct.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#5e534b]">{leadProduct.longDescription}</p>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <p className="text-xl font-semibold text-[#241d19]">{formatUAH(leadProduct.price)}</p>
                    <button type="button" onClick={() => addToCart(leadProduct.id)} className="btn-primary">
                      Add to cart
                    </button>
                    <Link className="btn-secondary" to={`/menu/${leadProduct.slug}`}>
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          )}

          <div className="space-y-5">
            {secondaryProducts.slice(0, 2).map((product) => (
              <article key={product.id} className="card-surface overflow-hidden p-4">
                <div className="flex gap-4">
                  <Link className="shrink-0 overflow-hidden rounded-2xl" to={`/menu/${product.slug}`}>
                    <SmartImage
                      src={product.image}
                      alt={product.name}
                      className="h-28 w-28 object-cover transition duration-500 hover:scale-105"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-xs uppercase tracking-wide text-[#846f63]">{product.category}</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#2a2320]">{product.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[#5e534b]">{product.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <span className="font-semibold text-[#2a2320]">{formatUAH(product.price)}</span>
                      <button type="button" onClick={() => addToCart(product.id)} className="btn-primary px-4 py-2 text-xs">
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {secondaryProducts.slice(2).map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
          ))}
        </div>
      </section>

      <section className="container-shell py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="card-surface overflow-hidden">
            <SmartImage
              src="https://images.unsplash.com/photo-1513267048331-5611cad62e41?auto=format&fit=crop&w=1400&q=80"
              alt="Warm interior of AURELIA cafe with natural light"
              className="h-[320px] w-full object-cover sm:h-[420px]"
            />
          </article>

          <div className="card-surface grid gap-7 bg-[#f7ede0] p-6 sm:p-8">
            <div>
              <SectionHeading
                eyebrow="Our philosophy"
                title="Precision, produce, and calm hospitality"
                description={businessInfo.story}
              />
            </div>
            <div className="space-y-4">
              {businessInfo.philosophy.map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-2xl bg-[#fff8ef] p-4">
                  <Coffee className="mt-0.5 h-5 w-5 text-[#8b4f38]" aria-hidden />
                  <p className="text-sm leading-relaxed text-[#544942]">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {seasonalProduct && (
        <section className="container-shell py-8">
          <div className="card-surface grid items-center gap-6 overflow-hidden p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#8b5339]">
                <Star className="h-4 w-4" /> Seasonal highlight
              </p>
              <h2 className="display-serif mt-3 text-4xl leading-[0.95] text-[#231d19]">{seasonalProduct.name}</h2>
              <p className="mt-2 max-w-2xl text-[#5f534b]">{seasonalProduct.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#f2e5d9] px-4 py-2 text-base font-semibold text-[#3d312a]">
                {formatUAH(seasonalProduct.price)}
              </span>
              <Link className="btn-secondary" to={`/menu/${seasonalProduct.slug}`}>
                Explore
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="container-shell py-12">
        <div className="overflow-hidden rounded-[2rem] border border-[#32453a] bg-[#1f2f29] shadow-[0_18px_45px_-26px_rgba(0,0,0,0.6)]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative p-7 text-white sm:p-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(145,199,170,0.24),transparent_40%),radial-gradient(circle_at_88%_60%,rgba(255,208,176,0.2),transparent_40%)]" />
              <div className="relative z-10">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#cde6d3]">
                  <Sparkles className="h-4 w-4" /> AI-Enhanced Service
                </p>
                <h2 className="display-serif mt-3 text-4xl leading-[0.95] text-[#f8f4ee] sm:text-5xl">
                  Not sure what to order? Meet your AI Barista.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#d8e7dd]">
                  Get recommendations by taste, dietary preference, and budget. The assistant is designed to use authoritative menu data
                  for ingredients and prices.
                </p>

                <div className="mt-6 space-y-3 rounded-2xl border border-[#426054] bg-[#273a32] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#b5d4c0]">Mock conversation</p>
                  <div className="rounded-2xl bg-[#32483f] px-4 py-3 text-sm text-[#e6f1ea]">
                    <span className="font-semibold">Customer:</span> “I want something sweet and not too strong.”
                  </div>
                  <div className="rounded-2xl bg-[#f0e4d5] px-4 py-3 text-sm text-[#2f2722]">
                    <span className="font-semibold">AI Barista:</span> “I’d pair a Matcha Latte with our Berry Cheesecake.”
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAiModalOpen(true)}
                  className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#203028] transition hover:-translate-y-0.5 hover:bg-[#f4f4f4]"
                >
                  <Leaf className="h-4 w-4" />
                  Ask AI Barista
                </button>
              </div>
            </div>

            <div className="relative min-h-[260px]">
              <SmartImage
                src="https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80"
                alt="Artful specialty coffee drink representing AI barista recommendations"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1b2b24]/65 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-14">
        <div className="relative overflow-hidden rounded-[2rem] border border-[#ddcebf] bg-[#fff9f2] p-8 text-center sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(194,144,113,0.16),transparent_40%),radial-gradient(circle_at_85%_70%,rgba(114,145,114,0.14),transparent_42%)]" />
          <div className="relative">
            <h2 className="display-serif text-5xl leading-[0.95] text-[#2a2320]">Ready for your next cup?</h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#5c5148]">
              Build your order in minutes and enjoy specialty coffee crafted with care.
            </p>
            <Link to="/menu" className="btn-primary mt-6">
              Start order <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <AIBaristaModal open={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </>
  )
}
