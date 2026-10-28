import Footer from "./_components/Footer"
import Navbar from "./_components/Navbar"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full overflow-x-hidden bg-surface text-ink">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
