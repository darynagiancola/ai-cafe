import { ArrowRight, Coffee, Leaf, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AIBaristaModal } from '../components/ai/AIBaristaModal'
import { ProductCard } from '../components/menu/ProductCard'
import { SectionHeading } from '../components/ui/SectionHeading'
import { useCart } from '../context/CartContext'
import { businessService } from '../services/businessService'
import { menuService } from '../services/menuService'

export function HomePage() {
  const featuredProducts = menuService.getFeaturedProducts(6)
  const { addToCart } = useCart()
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const businessInfo = businessService.getBusinessInfo()

  return (
    <>
      <section className="container-shell py-10 sm:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8b4f38]">Modern specialty coffee</p>
            <h1 className="text-4xl font-semibold leading-tight text-[#2a2320] sm:text-5xl">
              Crafted coffee and breakfast made for your best city mornings.
            </h1>
            <p className="max-w-xl text-base text-[#695f58] sm:text-lg">
              Order premium coffee, fresh breakfast, and elegant desserts online from {businessInfo.logoWordmark}. Pick up in minutes or
              schedule delivery.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/menu"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#8b4f38] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#73412d]"
              >
                Order now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/menu"
                className="focus-ring rounded-full border border-[#d8cabf] px-5 py-2.5 text-sm font-medium text-[#4f443e] transition hover:bg-[#f2e7dc]"
              >
                Explore menu
              </Link>
            </div>
          </div>

          <div className="card-surface overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1400&q=80"
              alt="Barista preparing specialty coffee at AURELIA café"
              className="h-[360px] w-full object-cover sm:h-[460px]"
            />
          </div>
        </div>
      </section>

      <section className="container-shell py-12">
        <SectionHeading
          eyebrow="Featured menu"
          title="Our most-loved picks"
          description="Balanced espresso drinks, refined pastries, and quality brunch staples."
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
          ))}
        </div>
      </section>

      <section className="container-shell py-12">
        <div className="card-surface grid gap-8 bg-[#f8efe5] p-6 sm:p-8 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Our philosophy"
              title="Precision, produce, and calm hospitality"
              description={businessInfo.story}
            />
          </div>
          <div className="space-y-4">
            {businessInfo.philosophy.map((point) => (
              <div key={point} className="flex items-start gap-3 rounded-xl bg-white/70 p-4">
                <Coffee className="mt-0.5 h-5 w-5 text-[#8b4f38]" aria-hidden />
                <p className="text-sm text-[#594f48]">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-12">
        <div className="card-surface grid items-center gap-6 border-[#d8c9bc] bg-[#274136] p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#d9ecd9]">
              <Sparkles className="h-4 w-4" /> Future AI Experience
            </p>
            <h2 className="text-3xl font-semibold">Not sure what to order? Ask our AI Barista.</h2>
            <p className="max-w-2xl text-sm text-[#d9e6dd] sm:text-base">
              Soon you’ll get personalized recommendations by taste, dietary preferences, and budget. The assistant will use verified
              menu data for ingredients and prices.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#264135] transition hover:bg-[#f2f2f2]"
          >
            <Leaf className="h-4 w-4" />
            Ask AI Barista
          </button>
        </div>
      </section>

      <section className="container-shell py-14">
        <div className="rounded-2xl border border-[#decfc2] bg-[#fff9f3] p-8 text-center">
          <h2 className="text-3xl font-semibold text-[#2a2320]">Ready for your next cup?</h2>
          <p className="mx-auto mt-3 max-w-xl text-[#695f58]">
            Build your order in minutes and enjoy specialty coffee crafted with care.
          </p>
          <Link
            to="/menu"
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-[#8b4f38] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#72402b]"
          >
            Start order <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <AIBaristaModal open={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </>
  )
}
