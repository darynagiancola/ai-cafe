import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="container-shell py-20">
      <div className="card-surface mx-auto max-w-xl p-10 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-[#8b4f38]">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#2a2320]">Page not found</h1>
        <p className="mt-2 text-[#695f58]">The page you requested does not exist.</p>
        <Link
          to="/"
          className="focus-ring mt-6 inline-flex rounded-full bg-[#8b4f38] px-6 py-2.5 text-sm font-medium text-white"
        >
          Back to home
        </Link>
      </div>
    </section>
  )
}
