import { Clock3, ExternalLink, Mail, MapPin, Navigation, Phone } from 'lucide-react'
import { SectionHeading } from '../components/ui/SectionHeading'
import { businessService } from '../services/businessService'

export function ContactPage() {
  const businessInfo = businessService.getBusinessInfo()
  const latitude = 50.4543
  const longitude = 30.5133
  const bbox = `${longitude - 0.01},${latitude - 0.0065},${longitude + 0.01},${latitude + 0.0065}`
  const mapQuery = new URLSearchParams({
    bbox,
    layer: 'mapnik',
    marker: `${latitude},${longitude}`,
  }).toString()
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?${mapQuery}`
  const mapDirectionsUrl = `https://www.openstreetmap.org/directions?to=${latitude}%2C${longitude}`
  const mapLocationUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`

  return (
    <section className="container-shell py-10 sm:py-14">
      <SectionHeading
        eyebrow="Contact & location"
        title="Visit AURELIA in Kyiv"
        description="Drop in for your morning ritual, brunch meetings, or an afternoon reset."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        <div className="card-surface bg-[#fffaf4] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b5339]">AURELIA Café</p>
          <h2 className="display-serif mt-3 text-4xl leading-[0.95] text-[#2a2320]">Find us in the heart of Kyiv</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#5f534b]">
            Designed as a calm city retreat, AURELIA welcomes morning routines, lunch meetings, and evening conversations over
            thoughtfully crafted coffee.
          </p>

          <div className="mt-6 space-y-5">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-[#8b4f38]" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-[#4e423a]">Address</h3>
                <p className="mt-1 text-base text-[#2a2320]">
                  {businessInfo.address}, {businessInfo.city}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 text-[#8b4f38]" aria-hidden />
              <div className="w-full">
                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-[#4e423a]">Opening hours</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-[#5f534b]">
                  {businessInfo.openingHours.map((hour) => (
                    <li key={hour.day} className="flex items-center justify-between gap-4 border-b border-[#ebdfd4] pb-1 last:border-none">
                      <span>{hour.day}</span>
                      <span className="font-medium text-[#3c332f]">{hour.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl bg-[#f4e8dc] p-4">
                <Phone className="mt-0.5 h-4 w-4 text-[#8b4f38]" aria-hidden />
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#695b51]">Phone</p>
                  <a
                    className="focus-ring mt-1 inline-block rounded text-sm font-medium text-[#2a2320] hover:text-[#7f4630]"
                    href={`tel:${businessInfo.phone.replace(/\s+/g, '')}`}
                  >
                    {businessInfo.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-[#f4e8dc] p-4">
                <Mail className="mt-0.5 h-4 w-4 text-[#8b4f38]" aria-hidden />
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#695b51]">Email</p>
                  <a className="focus-ring mt-1 inline-block rounded text-sm font-medium text-[#2a2320] hover:text-[#7f4630]" href={`mailto:${businessInfo.email}`}>
                    {businessInfo.email}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={mapDirectionsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              <Navigation className="h-4 w-4" />
              Get directions
            </a>
            <a href={mapLocationUrl} target="_blank" rel="noreferrer" className="btn-secondary">
              Open map <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {businessInfo.socials.map((social) => (
              <a
                key={social.label}
                href={social.url}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex rounded-full border border-[#d8c8b9] bg-[#fff8ef] px-4 py-2 text-sm font-medium text-[#4a3f39] transition hover:-translate-y-0.5 hover:bg-[#f2e6d8]"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>

        <div className="card-surface overflow-hidden bg-[#fffaf4] p-3 sm:p-4">
          <div className="h-[320px] overflow-hidden rounded-2xl border border-[#dbcdbf] sm:h-[480px]">
            <iframe
              title="AURELIA Cafe location map"
              src={mapEmbedUrl}
              className="h-full w-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <p className="px-2 pt-3 text-xs text-[#746961]">
            Interactive map powered by OpenStreetMap. Marker points to AURELIA Café location.
          </p>
        </div>
      </div>
    </section>
  )
}
