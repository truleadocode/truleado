"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, Loader2, FileDown } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { graphqlRequest, queries } from "@/lib/graphql/client"
import { useAuth } from "@/contexts/auth-context"

interface DiscoveryExport {
  id: string
  platform: string
  exportType: string
  filterSnapshot: unknown
  totalAccounts: number
  tokensSpent: number
  onsocialExportId: string | null
  status: string
  downloadUrl: string | null
  exportedBy: string
  createdAt: string
  completedAt: string | null
}

interface ExportsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
}

export function ExportsDrawer({ open, onOpenChange }: ExportsDrawerProps) {
  const { currentAgency } = useAuth()
  const [exports, setExports] = useState<DiscoveryExport[]>([])
  const [loading, setLoading] = useState(false)

  const agencyId = currentAgency?.id

  const fetchExports = useCallback(async () => {
    if (!agencyId) return
    setLoading(true)
    try {
      const data = await graphqlRequest<{
        discoveryExports: DiscoveryExport[]
      }>(queries.discoveryExports, { agencyId, limit: 20 })
      setExports(data.discoveryExports)
    } catch (err) {
      console.error("Failed to fetch exports:", err)
    } finally {
      setLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (open) {
      fetchExports()
    }
  }, [open, fetchExports])

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function getStatusBadge(status: string) {
    const config = STATUS_CONFIG[status.toLowerCase()] ?? {
      label: status,
      className: "bg-gray-100 text-gray-800 border-gray-300",
    }
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Downloads</SheetTitle>
          <SheetDescription>
            Your exported contact data and profile spreadsheets.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(100vh-10rem)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : exports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileDown className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No exports yet.
              </p>
            </div>
          ) : (
            exports.map((exp) => (
              <div
                key={exp.id}
                className="rounded-lg border p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {exp.platform}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {exp.exportType === "SHORT" ? "Short" : "Full"}
                    </Badge>
                  </div>
                  {getStatusBadge(exp.status)}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{exp.totalAccounts.toLocaleString()} accounts</span>
                  <span>{exp.tokensSpent} tokens</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(exp.createdAt)}
                  </span>
                  {exp.downloadUrl && exp.status.toLowerCase() === "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      asChild
                    >
                      <a
                        href={exp.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="mr-1.5 h-3 w-3" />
                        Download
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
