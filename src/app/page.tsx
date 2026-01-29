"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Shield, Zap, Users, BarChart3, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

const features = [
  {
    icon: Users,
    title: 'Client Management',
    description: 'Organize clients, projects, and campaigns in one place',
  },
  {
    icon: Zap,
    title: 'Campaign Engine',
    description: 'Streamlined workflows for influencer content creation',
  },
  {
    icon: CheckCircle,
    title: 'Approval Workflows',
    description: 'Multi-level approvals with full audit trail',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Role-based access control and data isolation',
  },
]

export default function HomePage() {
  const router = useRouter()
  const { user, agencies, loading } = useAuth()

  useEffect(() => {
    if (loading || !user) return
    if (agencies.length === 0) {
      router.push('/choose-agency')
    } else {
      router.push('/dashboard')
    }
  }, [user, agencies.length, loading, router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <svg
                className="h-5 w-5 text-white"
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
            <span className="text-xl font-bold">Truleado</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Zap className="h-4 w-4" />
            Built for Marketing Agencies
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Influencer Marketing,{' '}
            <span className="text-primary">Simplified</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The all-in-one platform for managing influencer campaigns, deliverables, 
            and client approvals. Built for agencies that demand excellence.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="xl" asChild>
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="/login">
                View Demo
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">Everything you need to succeed</h2>
          <p className="text-muted-foreground mt-2">
            Powerful features designed for modern marketing agencies
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary">500+</div>
              <p className="text-muted-foreground mt-1">Agencies Trust Us</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary">10K+</div>
              <p className="text-muted-foreground mt-1">Campaigns Managed</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary">99.9%</div>
              <p className="text-muted-foreground mt-1">Uptime SLA</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold">Ready to transform your workflow?</h2>
          <p className="text-muted-foreground">
            Join hundreds of agencies already using Truleado to streamline their 
            influencer marketing operations.
          </p>
          <Button size="xl" asChild>
            <Link href="/signup">
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <svg
                  className="h-4 w-4 text-white"
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
              <span className="font-semibold">Truleado</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Truleado. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
