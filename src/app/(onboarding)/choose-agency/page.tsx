"use client"

import Link from 'next/link'
import { Building2, Users, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Agency Choice screen — appears immediately after authentication when user has no agency.
 * User must choose: Create a new Agency OR Join an existing Agency.
 */
export default function ChooseAgencyPage() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Choose your agency</h1>
        <p className="text-muted-foreground mt-2">
          You need to be part of an agency to use Truleado. Create one or join your team.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow border-2 hover:border-primary/50">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Create a new Agency</CardTitle>
            <CardDescription>
              Start your own agency. You&apos;ll be the admin and can invite others later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="lg">
              <Link href="/create-agency">
                Create Agency
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-2 hover:border-primary/50">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Join an existing Agency</CardTitle>
            <CardDescription>
              Have an agency code? Enter it to join your team&apos;s workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/join-agency">
                Join with code
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        You can only belong to one agency for now. Need to switch? Contact support.
      </p>
    </div>
  )
}
