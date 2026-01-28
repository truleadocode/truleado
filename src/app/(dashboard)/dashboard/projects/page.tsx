"use client"

import { Plus, Briefcase, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'

export default function ProjectsPage() {
  return (
    <>
      <Header title="Projects" subtitle="Organize campaigns under projects" />
      
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search projects..." className="pl-9" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {/* Empty State */}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No projects yet</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              Projects help you organize campaigns for your clients. Create a client first, 
              then add projects to it.
            </p>
            <Button className="mt-6" variant="outline" asChild>
              <Link href="/dashboard/clients">
                View Clients
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
