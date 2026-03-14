import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <Sidebar />
      {/* md: offset for sidebar, mobile: offset for sticky top bar + bottom nav */}
      <div className="md:pl-60 pb-14 md:pb-0">
        {children}
      </div>
    </div>
  )
}
