import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import './globals.css'
import { ToastProvider } from '@/components/ErrorBoundary'
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary'
import Providers from './providers'

export const metadata: Metadata = {
  // Brand Consistency: Renaming from 'Reflog - Your AI Mentor' to 'Reflog AI Mentor'
  title: 'Reflog AI Mentor',
  description: 'AI mentor that provides brutally honest, data-driven feedback',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#933DC9',
          colorBackground: '#000000',
          colorInputBackground: '#242424',
          colorInputText: '#FBFAEE',
        },
        elements: {
          formButtonPrimary:
            'bg-gradient-to-r from-[#933DC9] to-[#53118F] hover:brightness-110',
          card: 'bg-[#242424] border border-[#242424]/60',
          headerTitle: 'text-[#FBFAEE]',
          headerSubtitle: 'text-[#FBFAEE]/70',
        },
      }}
    >
      <html lang="en">
        <body>
          <GlobalErrorBoundary>
            <Providers>
              <ToastProvider>
                {children}
              </ToastProvider>
            </Providers>
          </GlobalErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}