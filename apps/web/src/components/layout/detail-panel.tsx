'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@nexflow/ui/card'

interface DetailPanelProps {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export function DetailPanel({ title, children, actions }: DetailPanelProps) {
  return (
    <Card className="min-h-[500px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl">{title}</CardTitle>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
