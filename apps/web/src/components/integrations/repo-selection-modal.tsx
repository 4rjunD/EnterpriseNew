'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@nexflow/ui/button'
import { Input } from '@nexflow/ui/input'
import { toast } from '@nexflow/ui/toast'
import { cn } from '@nexflow/ui/utils'
import {
  X,
  Search,
  GitBranch,
  Lock,
  Globe,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

interface Repository {
  id: number
  owner: string
  name: string
  fullName: string
  description: string | null
  url: string
  language: string | null
  defaultBranch: string
  isPrivate: boolean
  stars: number
  updatedAt: string
}

interface RepoSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  availableRepos: Repository[]
  isLoading?: boolean
  onRefresh?: () => void
}

export function RepoSelectionModal({
  isOpen,
  onClose,
  availableRepos,
  isLoading = false,
  onRefresh,
}: RepoSelectionModalProps) {
  const [search, setSearch] = useState('')
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())
  const utils = trpc.useUtils()

  // Get already selected repos
  const { data: existingRepos } = trpc.repositories.listSelected.useQuery()

  // Pre-select already tracked repos
  useEffect(() => {
    if (existingRepos) {
      setSelectedRepos(new Set(existingRepos.map((r) => r.fullName)))
    }
  }, [existingRepos])

  const selectMutation = trpc.repositories.selectRepos.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Repositories selected',
        description: `Added ${data.selected} repositories for tracking`,
      })
      utils.repositories.listSelected.invalidate()
      onClose()
    },
    onError: (error) => {
      toast({
        title: 'Failed to select repositories',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  if (!isOpen) return null

  const filteredRepos = availableRepos.filter(
    (repo) =>
      repo.fullName.toLowerCase().includes(search.toLowerCase()) ||
      repo.description?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleRepo = (fullName: string) => {
    const newSet = new Set(selectedRepos)
    if (newSet.has(fullName)) {
      newSet.delete(fullName)
    } else {
      newSet.add(fullName)
    }
    setSelectedRepos(newSet)
  }

  const selectAll = () => {
    setSelectedRepos(new Set(filteredRepos.map((r) => r.fullName)))
  }

  const clearAll = () => {
    setSelectedRepos(new Set())
  }

  const handleSubmit = () => {
    const reposToSelect = availableRepos.filter((r) => selectedRepos.has(r.fullName))
    selectMutation.mutate({
      repos: reposToSelect.map((r) => ({
        owner: r.owner,
        name: r.name,
        fullName: r.fullName,
        description: r.description,
        url: r.url,
        language: r.language,
        defaultBranch: r.defaultBranch,
        isPrivate: r.isPrivate,
      })),
    })
  }

  const languageColors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f7df1e',
    Python: '#3572A5',
    Go: '#00ADD8',
    Rust: '#dea584',
    Java: '#b07219',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
          <div>
            <h2 className="text-[16px] font-semibold text-[#ededed]">Select Repositories</h2>
            <p className="text-[13px] text-[#888] mt-0.5">
              Choose which repositories NexFlow should analyze and track
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#1a1a1a] text-[#888] hover:text-[#ededed] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and actions */}
        <div className="p-4 border-b border-[#1a1a1a] space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              className="pl-9 bg-[#111] border-[#1a1a1a] text-[#ededed] placeholder:text-[#555]"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="text-[#888] hover:text-[#ededed]"
              >
                Select All ({filteredRepos.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-[#888] hover:text-[#ededed]"
              >
                Clear
              </Button>
            </div>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="text-[#888] hover:text-[#ededed]"
              >
                <RefreshCw className={cn('w-4 h-4 mr-1', isLoading && 'animate-spin')} />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Repository list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#888] animate-spin" />
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GitBranch className="w-8 h-8 text-[#555] mb-3" />
              <p className="text-[13px] text-[#888]">
                {search ? 'No repositories match your search' : 'No repositories found'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRepos.map((repo) => {
                const isSelected = selectedRepos.has(repo.fullName)
                const isAlreadyTracked = existingRepos?.some((r) => r.fullName === repo.fullName)

                return (
                  <div
                    key={repo.id}
                    onClick={() => toggleRepo(repo.fullName)}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-md cursor-pointer border transition-colors',
                      isSelected
                        ? 'bg-[#50e3c2]/10 border-[#50e3c2]/30'
                        : 'bg-[#111] border-[#1a1a1a] hover:border-[#252525]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5',
                        isSelected
                          ? 'bg-[#50e3c2] border-[#50e3c2]'
                          : 'border-[#333] bg-transparent'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-black" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[#ededed]">
                          {repo.fullName}
                        </span>
                        {repo.isPrivate ? (
                          <Lock className="w-3.5 h-3.5 text-[#555]" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-[#555]" />
                        )}
                        {isAlreadyTracked && (
                          <span className="text-[10px] font-mono text-[#50e3c2] px-1.5 py-0.5 bg-[#50e3c2]/10 rounded">
                            TRACKING
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-[12px] text-[#888] mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {repo.language && (
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor: languageColors[repo.language] || '#555',
                              }}
                            />
                            <span className="text-[11px] text-[#555]">{repo.language}</span>
                          </div>
                        )}
                        <span className="text-[11px] text-[#555]">
                          Updated {new Date(repo.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#1a1a1a] bg-[#0a0a0a]">
          <p className="text-[12px] text-[#555]">
            {selectedRepos.size} repositor{selectedRepos.size === 1 ? 'y' : 'ies'} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="text-[#888]">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedRepos.size === 0 || selectMutation.isLoading}
              className="bg-[#50e3c2] text-black hover:bg-[#3dcfb0]"
            >
              {selectMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Tracking
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
