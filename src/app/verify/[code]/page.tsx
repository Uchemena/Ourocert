import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerifyResult {
  valid: boolean
  recipientName?: string
  issuedBy?: string
  courseName?: string
  issuedAt?: string
  verificationCode?: string
  message?: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function VerifyPage({
  params,
}: {
  params: { code: string }
}) {
  let result: VerifyResult = { valid: false, message: 'Unable to verify certificate.' }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const res = await fetch(`${baseUrl}/api/verify/${params.code}`, {
      cache: 'no-store',
    })
    result = await res.json()
  } catch {
    // result stays as the default invalid state
  }

  const issuedDate = result.issuedAt
    ? new Date(result.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {result.valid ? (
          /* ── Valid certificate ── */
          <div className="bg-white border border-[#E8ECF4] rounded-2xl shadow-sm overflow-hidden">
            {/* Green header strip */}
            <div className="bg-green-500 px-6 py-5 text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M5 14l6 6 12-12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="text-lg font-bold text-white">This certificate is valid</h1>
            </div>

            {/* Certificate details */}
            <div className="px-6 py-6 space-y-4">
              <Row label="Issued to" value={result.recipientName} />
              <Row label="Issued by" value={result.issuedBy} />
              <Row label="Course" value={result.courseName} />
              {issuedDate && <Row label="Issue date" value={issuedDate} />}

              {/* Verification code */}
              <div className="pt-4 border-t border-[#E8ECF4]">
                <p className="text-xs text-gray-400 mb-1">Verification code</p>
                <p className="font-mono text-sm font-semibold text-gray-700 tracking-widest">
                  {result.verificationCode}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 text-center">
              <p className="text-xs text-gray-400">
                Powered by{' '}
                <a
                  href="https://ourocert.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Ourocert
                </a>
              </p>
            </div>
          </div>

        ) : (

          /* ── Invalid certificate ── */
          <div className="bg-white border border-[#E8ECF4] rounded-2xl shadow-sm overflow-hidden">
            {/* Red header strip */}
            <div className="bg-red-500 px-6 py-5 text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M8 8l12 12M20 8L8 20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 className="text-lg font-bold text-white">Certificate not found</h1>
            </div>

            <div className="px-6 py-6 text-center">
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                This verification code doesn&apos;t match any certificate in our system.
                It may be invalid or the certificate may not have been sent yet.
              </p>
              <a
                href="https://ourocert.com"
                className="inline-block px-5 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition"
              >
                Go to Ourocert
              </a>
            </div>
          </div>

        )}
      </div>
    </div>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
