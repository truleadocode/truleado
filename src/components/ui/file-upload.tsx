"use client"

import { useState, useCallback, useRef } from 'react'
import { Upload, File, X, AlertCircle, Loader2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>
  accept?: string
  maxSize?: number // in bytes
  className?: string
  disabled?: boolean
}

export function FileUpload({
  onUpload,
  accept,
  maxSize = 50 * 1024 * 1024, // 50MB default
  className,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `File size must be less than ${formatFileSize(maxSize)}`
    }
    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim())
      const fileType = file.type
      const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExt === type.toLowerCase()
        }
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.replace('/*', '/'))
        }
        return fileType === type
      })
      
      if (!isAccepted) {
        return `File type not accepted. Allowed: ${accept}`
      }
    }
    return null
  }

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    
    setSelectedFile(file)
    setIsUploading(true)
    
    try {
      await onUpload(file)
      setSelectedFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [onUpload, maxSize, accept])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [disabled, handleFile])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFile])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
          isDragging && 'border-primary bg-primary/5',
          !isDragging && 'border-muted-foreground/25 hover:border-muted-foreground/50',
          (disabled || isUploading) && 'cursor-not-allowed opacity-60',
          error && 'border-destructive'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        <div className="flex flex-col items-center gap-2 text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              <div>
                <p className="font-medium">Uploading...</p>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Max size: {formatFileSize(maxSize)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// Compact file display component
interface FileItemProps {
  fileName: string
  fileSize?: number | null
  onDownload?: () => void
  onRemove?: () => void
  isRemoving?: boolean
  isDownloading?: boolean
}

export function FileItem({ 
  fileName, 
  fileSize, 
  onDownload, 
  onRemove, 
  isRemoving,
  isDownloading 
}: FileItemProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div 
        className={cn(
          "flex items-center gap-3 min-w-0 flex-1",
          onDownload && "cursor-pointer hover:opacity-80"
        )}
        onClick={onDownload}
      >
        <div className="h-10 w-10 rounded bg-background flex items-center justify-center shrink-0">
          {isDownloading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            <File className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className={cn(
            "font-medium truncate",
            onDownload && "text-primary hover:underline"
          )}>
            {fileName}
          </p>
          {fileSize && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(fileSize)}
            </p>
          )}
        </div>
      </div>
      {onRemove && (
        <Button 
          variant="ghost" 
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          disabled={isRemoving}
          className="shrink-0"
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          )}
        </Button>
      )}
    </div>
  )
}
