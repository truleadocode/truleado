"use client"

import { useState, useCallback } from 'react'
import { FileText, Hash, AtSign, Upload, X, File } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { FileUpload } from '@/components/ui/file-upload'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import type { CampaignFormState } from './types'

interface Step2BriefProps {
  form: CampaignFormState
  update: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void
  onUploadFile: (file: globalThis.File) => Promise<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string }>
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  )
}

function TagInput({
  label,
  placeholder,
  prefix,
  values,
  onChange,
}: {
  label: string
  placeholder: string
  prefix: string
  values: string[]
  onChange: (values: string[]) => void
}) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const tag = input.trim().replace(/^[#@]+/, '')
    if (tag && !values.includes(tag)) {
      onChange([...values, tag])
    }
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(values.filter((v) => v !== tag))
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>
          <Input
            className="pl-7"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag()
              }
            }}
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={!input.trim()}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pl-2.5 pr-1 py-1">
              {prefix}{tag}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Step2Brief({ form, update, onUploadFile }: Step2BriefProps) {
  const handleFileUpload = useCallback(async (file: globalThis.File) => {
    const result = await onUploadFile(file)
    update('attachmentUrls', [...form.attachmentUrls, result])
  }, [form.attachmentUrls, onUploadFile, update])

  const removeAttachment = (idx: number) => {
    update('attachmentUrls', form.attachmentUrls.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-6">
      {/* Brief */}
      <SectionHeader icon={FileText} title="Campaign Brief" />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Creative Brief</Label>
          <p className="text-xs text-muted-foreground">Rich text brief shared with creators. Include messaging, dos and don&apos;ts, brand guidelines.</p>
          <RichTextEditor
            content={form.brief}
            onChange={(html) => update('brief', html)}
            placeholder="Write the campaign brief..."
          />
        </div>

        <div className="space-y-2">
          <Label>Posting Instructions</Label>
          <Textarea
            rows={3}
            placeholder="e.g., Post between 6-9 PM IST. Tag brand in first line. Use link in bio..."
            value={form.postingInstructions}
            onChange={(e) => update('postingInstructions', e.target.value)}
          />
        </div>
      </div>

      <Separator />

      {/* Hashtags & Mentions */}
      <SectionHeader icon={Hash} title="Hashtags & Mentions" />
      <div className="space-y-4">
        <TagInput
          label="Required Hashtags"
          placeholder="BrandName"
          prefix="#"
          values={form.hashtags}
          onChange={(v) => update('hashtags', v)}
        />
        <TagInput
          label="Required Mentions"
          placeholder="brandhandle"
          prefix="@"
          values={form.mentions}
          onChange={(v) => update('mentions', v)}
        />
      </div>

      <Separator />

      {/* Rights & Exclusivity */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Rights & Exclusivity</h3>

        <div className="flex items-center justify-between">
          <div>
            <Label>Exclusivity Clause</Label>
            <p className="text-xs text-muted-foreground">Creator cannot promote competing brands</p>
          </div>
          <Switch
            checked={form.exclusivityClause}
            onCheckedChange={(v) => update('exclusivityClause', v)}
          />
        </div>

        {form.exclusivityClause && (
          <div className="space-y-2">
            <Label>Exclusivity Terms</Label>
            <Textarea
              rows={2}
              placeholder="e.g., No competing beauty brand posts for 30 days before and after campaign..."
              value={form.exclusivityTerms}
              onChange={(e) => update('exclusivityTerms', e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Content Usage Rights</Label>
          <Textarea
            rows={2}
            placeholder="e.g., Brand may repurpose content on owned channels for 6 months..."
            value={form.contentUsageRights}
            onChange={(e) => update('contentUsageRights', e.target.value)}
          />
        </div>
      </div>

      <Separator />

      {/* Gifting / Product */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Product Gifting</h3>
            <p className="text-xs text-muted-foreground">Will products be sent to creators?</p>
          </div>
          <Switch
            checked={form.giftingEnabled}
            onCheckedChange={(v) => update('giftingEnabled', v)}
          />
        </div>

        {form.giftingEnabled && (
          <div className="space-y-2">
            <Label>Gifting Details</Label>
            <Textarea
              rows={3}
              placeholder="List products, sizes, shipping instructions, deadlines..."
              value={form.giftingDetails}
              onChange={(e) => update('giftingDetails', e.target.value)}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Attachments */}
      <SectionHeader icon={Upload} title="Attachments" />
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Upload brand guidelines, mood boards, or reference materials.</p>
        <FileUpload onUpload={handleFileUpload} />
        {form.attachmentUrls.length > 0 && (
          <div className="space-y-2">
            {form.attachmentUrls.map((att, idx) => (
              <div key={idx} className="flex items-center justify-between px-3 py-2 border rounded-md text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <File className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{att.fileName}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(att.fileSize)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeAttachment(idx)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
