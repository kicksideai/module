// SPDX-License-Identifier: LicenseRef-KickSide-Community-1.0
import { defineComponent, h, onMounted } from 'vue'
import type { Component } from 'vue'

// Lazy boundary for a page entry. It keeps the declared `error: { message, error }`
// event, which the wrapper's own lazyConfig rejection reduces to `{ message }`. The
// caller passes the wrapper's `useEvents`, so an entry and its lazy chunk share nothing
// but the wrapper's own chunk.
type UseEvents = <Events>() => <K extends keyof Events>(event: K, detail: Events[K]) => void

interface FailureEvents {
  error: { message: string, error: unknown }
}

const loadTimeoutMs = 30000

// A request that never settles must not leave the loader up forever.
function withTimeout<T>(load: Promise<T>) {
  let timer: ReturnType<typeof setTimeout>
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Loading timed out after ${loadTimeoutMs} ms.`)), loadTimeoutMs)
  })
  return Promise.race([load, limit]).finally(() => clearTimeout(timer))
}

// The rejection is caught here, so the mount config always resolves and the failure
// root owns the event.
export function lazyPage<T extends { rootComponent: Component }>(
  load: () => Promise<T>,
  message: string,
  useEvents: UseEvents,
) {
  return () => withTimeout(load()).catch((error: unknown) => ({
    rootComponent: defineComponent(() => {
      const emit = useEvents<FailureEvents>()
      onMounted(() => emit('error', { message, error }))
      return () => h('wippy-error', { title: 'Failed to load', message })
    }),
  }))
}
