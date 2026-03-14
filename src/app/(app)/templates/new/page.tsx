import Link from 'next/link'

export default function NewTemplatePage() {
  return (
    <div className="px-6 py-8 md:px-8 md:py-10 max-w-4xl mx-auto">

      {/* Back */}
      <Link
        href="/templates"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-8"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Templates
      </Link>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">New Template</h1>
        <p className="text-sm text-gray-400 mt-1">
          How would you like to create your certificate template?
        </p>
      </div>

      {/* Two choice cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Upload */}
        <Link href="/templates/new/upload" className="group">
          <div className="h-full bg-white border-2 border-[#E8ECF4] rounded-xl p-8 flex flex-col items-center text-center hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer">
            <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-5 group-hover:bg-primary/12 transition-colors">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 22V10M16 10l-5 5M16 10l5 5" stroke="#3B5BDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 24h20" stroke="#3B5BDB" strokeWidth="2" strokeLinecap="round"/>
                <rect x="3" y="3" width="26" height="26" rx="6" stroke="#3B5BDB" strokeWidth="1.5" strokeDasharray="4 3"/>
              </svg>
            </div>

            <h2 className="text-base font-bold text-gray-900 mb-2">Upload a Design</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Already have a certificate designed? Upload a PDF or image and we&apos;ll add the variable fields for you.
            </p>

            <ul className="space-y-2 text-left w-full max-w-[200px] mb-6">
              {['PDF, PNG, JPG supported', 'Drag-and-drop fields', 'Auto-detects text areas'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-gray-500">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                    <circle cx="7" cy="7" r="6" fill="#3B5BDB" fillOpacity="0.1"/>
                    <path d="M4.5 7l2 2 3-3" stroke="#3B5BDB" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <span className="mt-auto w-full py-2.5 rounded-[10px] border-2 border-primary text-primary text-sm font-semibold group-hover:bg-primary group-hover:text-white transition-all">
              Upload File
            </span>
          </div>
        </Link>

        {/* Design */}
        <Link href="/templates/new/design" className="group">
          <div className="h-full bg-white border-2 border-[#E8ECF4] rounded-xl p-8 flex flex-col items-center text-center hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer">
            <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-5 group-hover:bg-primary/12 transition-colors">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="4" width="24" height="24" rx="5" stroke="#3B5BDB" strokeWidth="1.5"/>
                <path d="M9 23l4-4 3 3 4-6 3 7" stroke="#3B5BDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="11" cy="11" r="2.5" stroke="#3B5BDB" strokeWidth="1.5"/>
                <path d="M20 8h4M20 11.5h3" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>

            <h2 className="text-base font-bold text-gray-900 mb-2">Design from Scratch</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Use our drag-and-drop canvas editor to build your certificate design from the ground up.
            </p>

            <ul className="space-y-2 text-left w-full max-w-[200px] mb-6">
              {['Visual canvas editor', 'Custom fonts & colours', 'Live preview as you build'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-gray-500">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                    <circle cx="7" cy="7" r="6" fill="#3B5BDB" fillOpacity="0.1"/>
                    <path d="M4.5 7l2 2 3-3" stroke="#3B5BDB" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <span className="mt-auto w-full py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold group-hover:bg-primary/90 transition-all">
              Open Editor
            </span>
          </div>
        </Link>

      </div>
    </div>
  )
}
