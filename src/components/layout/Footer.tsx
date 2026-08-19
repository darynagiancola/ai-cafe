import { Globe, MessageCircle, Music2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { businessService } from '../../services/businessService'

const socialIconByLabel: Record<string, ReactNode> = {
  Instagram: <Globe className="h-4 w-4" aria-hidden />,
  Facebook: <MessageCircle className="h-4 w-4" aria-hidden />,
  TikTok: <Music2 className="h-4 w-4" aria-hidden />,
}

export function Footer() {
  const businessInfo = businessService.getBusinessInfo()

  return (
    <footer className="mt-20 border-t border-[#e6d7c8] bg-[#efe3d3]">
      <div className="container-shell grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 pr-3">
          <p className="display-serif text-2xl font-semibold tracking-[0.1em] text-[#2a2320]">{businessInfo.logoWordmark}</p>
          <p className="text-sm leading-relaxed text-[#5d5047]">{businessInfo.tagline}</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a473b]">Navigate</h2>
          <ul className="space-y-2 text-sm text-[#5f534b]">
            <li>
              <Link className="focus-ring rounded hover:text-[#7f4630]" to="/">
                Home
              </Link>
            </li>
            <li>
              <Link className="focus-ring rounded hover:text-[#7f4630]" to="/menu">
                Menu
              </Link>
            </li>
            <li>
              <Link className="focus-ring rounded hover:text-[#7f4630]" to="/about">
                About
              </Link>
            </li>
            <li>
              <Link className="focus-ring rounded hover:text-[#7f4630]" to="/contact">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a473b]">Opening hours</h2>
          <ul className="space-y-2 text-sm text-[#5f534b]">
            {businessInfo.openingHours.map((hour) => (
              <li className="flex justify-between gap-3" key={hour.day}>
                <span>{hour.day}</span>
                <span>{hour.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a473b]">Contact</h2>
          <p className="text-sm text-[#5f534b]">
            {businessInfo.address}, {businessInfo.city}
          </p>
          <p className="text-sm text-[#5f534b]">{businessInfo.phone}</p>
          <p className="text-sm text-[#5f534b]">{businessInfo.email}</p>
          <div className="flex gap-2">
            {businessInfo.socials.map((social) => (
              <a
                key={social.label}
                className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d7c7b8] bg-[#f7f0e8] text-[#5f534b] transition hover:-translate-y-0.5 hover:bg-[#f2e5d8] hover:text-[#2f2824]"
                href={social.url}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
              >
                {socialIconByLabel[social.label] ?? <span className="text-xs">{social.label[0]}</span>}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-[#dfcebe] py-4 text-center text-sm text-[#766a61]">
        © {new Date().getFullYear()} {businessInfo.brandName}. All rights reserved.
      </div>
    </footer>
  )
}
