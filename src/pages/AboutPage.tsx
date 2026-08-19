import { Bean, HeartHandshake, Sprout } from 'lucide-react'
import { SectionHeading } from '../components/ui/SectionHeading'
import { businessService } from '../services/businessService'

export function AboutPage() {
  const businessInfo = businessService.getBusinessInfo()

  return (
    <section className="container-shell py-10 sm:py-14">
      <SectionHeading
        eyebrow="About us"
        title={`Inside ${businessInfo.logoWordmark}`}
        description={businessInfo.story}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <article className="card-surface p-6">
          <Bean className="h-6 w-6 text-[#8b4f38]" />
          <h2 className="mt-4 text-xl font-semibold text-[#2a2320]">Coffee philosophy</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#695f58]">
            Every cup starts with clean, traceable beans and precise extraction. We profile each roast for sweetness, balance, and
            clarity.
          </p>
        </article>

        <article className="card-surface p-6">
          <Sprout className="h-6 w-6 text-[#5b7a67]" />
          <h2 className="mt-4 text-xl font-semibold text-[#2a2320]">Sourcing & ingredients</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#695f58]">
            We work with trusted suppliers, seasonal produce, and house-made elements to keep flavors natural, bright, and honest.
          </p>
        </article>

        <article className="card-surface p-6">
          <HeartHandshake className="h-6 w-6 text-[#8b4f38]" />
          <h2 className="mt-4 text-xl font-semibold text-[#2a2320]">Atmosphere</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#695f58]">
            AURELIA is designed as a calm urban retreat: soft tones, warm service, and a pace that gives your morning more room.
          </p>
        </article>
      </div>
    </section>
  )
}
