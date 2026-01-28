import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Truleado - Authentication',
  description: 'Sign in to your Truleado account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">Truleado</span>
          </div>
        </div>
        
        <div className="space-y-6">
          <blockquote className="text-xl text-white/90 font-medium leading-relaxed">
            &ldquo;Truleado has transformed how we manage influencer campaigns. 
            The approval workflows and client collaboration features are game-changers.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-semibold">
              SK
            </div>
            <div>
              <p className="text-white font-medium">Sarah Kim</p>
              <p className="text-white/70 text-sm">Head of Influencer Marketing, Acme Agency</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 text-white/60 text-sm">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>SOC 2 Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>End-to-End Encrypted</span>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
