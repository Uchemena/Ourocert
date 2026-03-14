import SignOutButton from './SignOutButton'

export default function Navbar() {
  return (
    <header className="w-full border-b border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z"
                fill="white"
              />
            </svg>
          </div>
          <span className="text-base font-bold text-navy tracking-tight">OUROCERT</span>
        </div>

        <SignOutButton />
      </div>
    </header>
  )
}
