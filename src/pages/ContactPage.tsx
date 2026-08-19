import { Clock3, Mail, MapPin, Phone } from 'lucide-react'
import { SectionHeading } from '../components/ui/SectionHeading'
import { businessService } from '../services/businessService'

export function ContactPage() {
  const businessInfo = businessService.getBusinessInfo()

  return (
    <section className="container-shell py-10 sm:py-14">
      <SectionHeading
        eyebrow="Contact & location"
        title="Visit AURELIA in Kyiv"
        description="Drop in for your morning ritual, brunch meetings, or an afternoon reset."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <article className="card-surface flex items-start gap-3 bg-[#fffaf4] p-5">
            <MapPin className="mt-0.5 h-5 w-5 text-[#8b4f38]" />
            <div>
              <h2 className="text-base font-semibold text-[#2a2320]">Address</h2>
              <p className="mt-1 text-sm text-[#695f58]">
                {businessInfo.address}, {businessInfo.city}
              </p>
            </div>
          </article>

          <article className="card-surface flex items-start gap-3 bg-[#fffaf4] p-5">
            <Clock3 className="mt-0.5 h-5 w-5 text-[#8b4f38]" />
            <div>
              <h2 className="text-base font-semibold text-[#2a2320]">Opening hours</h2>
              <ul className="mt-1 space-y-1 text-sm text-[#695f58]">
                {businessInfo.openingHours.map((hour) => (
                  <li key={hour.day}>
                    {hour.day}: {hour.time}
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="card-surface flex items-start gap-3 bg-[#fffaf4] p-5">
            <Phone className="mt-0.5 h-5 w-5 text-[#8b4f38]" />
            <div>
              <h2 className="text-base font-semibold text-[#2a2320]">Phone</h2>
              <a className="focus-ring mt-1 inline-block rounded text-sm text-[#695f58]" href={`tel:${businessInfo.phone.replace(/\s+/g, '')}`}>
                {businessInfo.phone}
              </a>
            </div>
          </article>

          <article className="card-surface flex items-start gap-3 bg-[#fffaf4] p-5">
            <Mail className="mt-0.5 h-5 w-5 text-[#8b4f38]" />
            <div>
              <h2 className="text-base font-semibold text-[#2a2320]">Email</h2>
              <a className="focus-ring mt-1 inline-block rounded text-sm text-[#695f58]" href={`mailto:${businessInfo.email}`}>
                {businessInfo.email}
              </a>
            </div>
          </article>
        </div>

        <div className="card-surface bg-[#fffaf4] p-5">
          <h2 className="display-serif text-3xl font-semibold text-[#2a2320]">Map</h2>
          <div className="mt-3 flex h-[380px] items-center justify-center rounded-2xl border border-dashed border-[#d8cabe] bg-[#f5ece3] p-6 text-center text-sm text-[#6f635b]">
            {businessInfo.mapEmbedHint}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {businessInfo.socials.map((social) => (
              <a
                key={social.label}
                href={social.url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary px-4 py-2 text-sm"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
