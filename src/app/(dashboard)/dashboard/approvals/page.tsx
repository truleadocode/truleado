"use client"

import { FileCheck, Search, Filter, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'

export default function ApprovalsPage() {
  return (
    <>
      <Header title="Approvals" subtitle="Review pending approvals" />
      
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search approvals..." className="pl-9" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">All</Button>
            <Button variant="outline">Pending</Button>
            <Button variant="outline">Approved</Button>
            <Button variant="outline">Rejected</Button>
          </div>
        </div>

        {/* Empty State */}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No pending approvals</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              When deliverables are submitted for review, they&apos;ll appear here for your approval.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
