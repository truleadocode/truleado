"use client"

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STEP_LABELS } from './types'

interface StepProgressProps {
  currentStep: number
  onStepClick: (step: number) => void
  completedSteps: Set<number>
}

export function StepProgress({ currentStep, onStepClick, completedSteps }: StepProgressProps) {
  return (
    <nav className="flex items-center gap-1 px-6 py-3 border-b overflow-x-auto">
      {STEP_LABELS.map((label, idx) => {
        const step = idx + 1
        const isActive = step === currentStep
        const isCompleted = completedSteps.has(step)
        const isClickable = isCompleted || step <= currentStep

        return (
          <div key={step} className="flex items-center">
            {idx > 0 && (
              <div className={cn('w-6 h-px mx-1', isCompleted || isActive ? 'bg-primary' : 'bg-border')} />
            )}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(step)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                isActive && 'bg-primary text-primary-foreground',
                !isActive && isCompleted && 'text-primary hover:bg-primary/10 cursor-pointer',
                !isActive && !isCompleted && 'text-muted-foreground',
                !isClickable && 'cursor-not-allowed opacity-50'
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold shrink-0',
                  isActive && 'bg-primary-foreground text-primary',
                  !isActive && isCompleted && 'bg-primary text-primary-foreground',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted && !isActive ? <Check className="h-3 w-3" /> : step}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
