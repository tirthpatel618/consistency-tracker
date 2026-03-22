import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-900/90 text-yellow-100 text-center text-sm py-2 px-4">
      You're offline — showing cached data
    </div>
  )
}
