'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@nexflow/ui/button'
import { toast } from '@nexflow/ui/toast'
import { cn } from '@nexflow/ui/utils'
import { Skeleton } from '@nexflow/ui/skeleton'
import { Clock, Calendar, Loader2, Save } from 'lucide-react'

export function FocusTimeSettings() {
  const { data: preferences, isLoading } = trpc.calendar.getPreferences.useQuery()
  const { data: integrationStatus } = trpc.calendar.getIntegrationStatus.useQuery()

  const [localPrefs, setLocalPrefs] = useState({
    preferredFocusHours: preferences?.preferredFocusHours || 4,
    focusStartTime: preferences?.focusStartTime || '09:00',
    focusEndTime: preferences?.focusEndTime || '17:00',
    autoBlockEnabled: preferences?.autoBlockEnabled || false,
  })

  const updateMutation = trpc.calendar.updatePreferences.useMutation({
    onSuccess: () => {
      toast({ title: 'Preferences saved' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const handleSave = () => {
    updateMutation.mutate(localPrefs)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Integration status */}
      <div className={cn(
        'p-4 rounded-lg border',
        integrationStatus?.connected
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
      )}>
        <div className="flex items-center gap-3">
          <Calendar className={cn(
            'w-5 h-5',
            integrationStatus?.connected ? 'text-green-400' : 'text-amber-400'
          )} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {integrationStatus?.connected ? 'Google Calendar Connected' : 'Calendar Not Connected'}
            </p>
            <p className="text-xs text-foreground-muted">
              {integrationStatus?.connected
                ? `Last synced ${integrationStatus.lastSyncAt ? new Date(integrationStatus.lastSyncAt).toLocaleString() : 'never'}`
                : 'Connect your calendar to enable auto-blocking'}
            </p>
          </div>
        </div>

        {!integrationStatus?.connected && (
          <Button className="mt-3 w-full" disabled>
            Connect Google Calendar (Coming Soon)
          </Button>
        )}
      </div>

      {/* Preferences */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Focus Time Preferences
        </h4>

        {/* Preferred focus hours */}
        <div>
          <label className="text-xs text-foreground-muted block mb-1">
            Preferred daily focus hours
          </label>
          <select
            value={localPrefs.preferredFocusHours}
            onChange={(e) =>
              setLocalPrefs({ ...localPrefs, preferredFocusHours: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
              <option key={h} value={h}>
                {h} hour{h > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Working hours */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-foreground-muted block mb-1">Focus start time</label>
            <input
              type="time"
              value={localPrefs.focusStartTime}
              onChange={(e) => setLocalPrefs({ ...localPrefs, focusStartTime: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-muted block mb-1">Focus end time</label>
            <input
              type="time"
              value={localPrefs.focusEndTime}
              onChange={(e) => setLocalPrefs({ ...localPrefs, focusEndTime: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Auto-block toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
          <div>
            <p className="text-sm font-medium text-foreground">Auto-block focus time</p>
            <p className="text-xs text-foreground-muted">
              Automatically schedule focus blocks on your calendar
            </p>
          </div>
          <button
            onClick={() =>
              setLocalPrefs({ ...localPrefs, autoBlockEnabled: !localPrefs.autoBlockEnabled })
            }
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors',
              localPrefs.autoBlockEnabled ? 'bg-blue-500' : 'bg-foreground-muted/30'
            )}
          >
            <span
              className={cn(
                'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
                localPrefs.autoBlockEnabled && 'translate-x-5'
              )}
            />
          </button>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={updateMutation.isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {updateMutation.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
