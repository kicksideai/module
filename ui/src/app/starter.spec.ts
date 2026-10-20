import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { HOST_VISIBILITY_PROVIDER } from '@wippy-fe/webcomponent-vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Starter from './starter.vue'

const proxy = vi.hoisted(() => ({
  get: vi.fn(),
  handlers: new Map<string, (message: unknown) => void>(),
}))

vi.mock('@wippy-fe/proxy', () => ({
  api: { get: proxy.get },
  on: (topic: string, handler: (message: unknown) => void) => {
    proxy.handlers.set(topic, handler)
    return () => proxy.handlers.delete(topic)
  },
}))

describe('starter page refresh', () => {
  let count: number
  const visible = ref<boolean | null>(true)
  let wrapper: ReturnType<typeof mount> | undefined

  beforeEach(() => {
    count = 0
    visible.value = true
    proxy.handlers.clear()
    proxy.get.mockReset().mockImplementation(async () => ({
      data: { success: true, module: 'acme/starter', count },
    }))
  })
  afterEach(() => wrapper?.unmount())

  function open() {
    wrapper = mount(Starter, {
      global: { provide: { [HOST_VISIBILITY_PROVIDER]: visible }, stubs: { Icon: true } },
    })
    return wrapper
  }

  it('refetches committed state when a notification reaches the mounted page', async () => {
    const page = open()
    await flushPromises()
    expect(page.get('.st-count').text()).toBe('0')
    expect(proxy.handlers.has('acme.starter.changed')).toBe(true)

    count = 1
    proxy.handlers.get('acme.starter.changed')?.({ data: { count: 99 } })
    await flushPromises()

    expect(proxy.get).toHaveBeenLastCalledWith('/api/v1/starter/status')
    expect(page.get('.st-count').text()).toBe('1')
    page.unmount()
    wrapper = undefined
    expect(proxy.handlers.size).toBe(0)
  })

  it('refetches on a host reveal without remounting or duplicating subscriptions', async () => {
    const page = open()
    await flushPromises()
    expect(proxy.get).toHaveBeenCalledTimes(1)
    visible.value = false
    await flushPromises()
    count = 2
    expect(proxy.get).toHaveBeenCalledTimes(1)
    visible.value = true
    await flushPromises()

    expect(page.get('.st-count').text()).toBe('2')
    expect(proxy.get).toHaveBeenCalledTimes(2)
    expect(proxy.handlers.size).toBe(1)
  })

  it('keeps the latest read when an earlier response arrives last', async () => {
    let finishInitial!: (response: unknown) => void
    proxy.get.mockImplementationOnce(() => new Promise(resolve => { finishInitial = resolve }))
    const page = open()
    count = 3
    proxy.handlers.get('acme.starter.changed')?.({})
    await flushPromises()
    finishInitial({ data: { success: true, module: 'acme/starter', count: 0 } })
    await flushPromises()
    expect(page.get('.st-count').text()).toBe('3')
  })
})
