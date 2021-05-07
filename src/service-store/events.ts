import { getId } from '../utils'
import _debounce from 'lodash/debounce'
import { models } from '../models'
import { BaseModel } from '.'
import { OfTypeModel, ServiceOptions, ServiceStore } from './types'
import { SetupOptions, EventName, Item } from '../types'

export interface ServiceEventsDebouncedQueue {
  addOrUpdateById: Record<string|number, Item>
  removeItemById: Record<string|number, Item>
  enqueueAddOrUpdate(item: Item): void
  enqueueRemoval(item: Item): void
  flushAddOrUpdateQueue(): void
  flushRemoveItemQueue(): void
}

interface EnableServiceEventsOptions {
  service: any
  Model: OfTypeModel
  store: ServiceStore
  options: Required<Pick<ServiceOptions, "idField">> & Required<Pick<SetupOptions, "debounceEventsMaxWait" | "debounceEventsTime" | "handleEvents">>
}

export function enableServiceEvents({
  service,
  Model,
  store,
  options,
}: EnableServiceEventsOptions): ServiceEventsDebouncedQueue {
  const debouncedQueue: ServiceEventsDebouncedQueue = {
    addOrUpdateById: {},
    removeItemById: {},
    enqueueAddOrUpdate(item): void {
      const id = getId(item, options.idField)
      this.addOrUpdateById[id] = item
      if (Object.prototype.hasOwnProperty.call(this.removeItemById, id)) {
        delete this.removeItemById[id]
      }
      this.flushAddOrUpdateQueue()
    },
    enqueueRemoval(item): void {
      const id = getId(item, options.idField)
      this.removeItemById[id] = item
      if (Object.prototype.hasOwnProperty.call(this.addOrUpdateById, id)) {
        delete this.addOrUpdateById[id]
      }
      this.flushRemoveItemQueue()
    },
    flushAddOrUpdateQueue: _debounce(
      async function () {
        const values = Object.values(this.addOrUpdateById)
        if (values.length === 0) return
        await store.addOrUpdate(values)
        this.addOrUpdateById = {}
      },
      options.debounceEventsTime || 20,
      { maxWait: options.debounceEventsMaxWait }
    ),
    flushRemoveItemQueue: _debounce(
      function () {
        const values = Object.values(this.removeItemById)
        if (values.length === 0) return
        store.removeFromStore(values)
        this.removeItemById = {}
      },
      options.debounceEventsTime || 20,
      { maxWait: options.debounceEventsMaxWait }
    ),
  }

  const handleEvent = (eventName: EventName, item: any, mutationName: string): void => {
    const handler = options.handleEvents[eventName]
    const confirmOrArray = handler(item, { model: Model, models })
    const [affectsStore, modified = item] = Array.isArray(confirmOrArray)
      ? confirmOrArray
      : [confirmOrArray]
    if (affectsStore) {
      if (!options.debounceEventsTime) {
        eventName === 'removed' ? store.removeFromStore(modified) : store[mutationName](modified)
      } else {
        eventName === 'removed'
          ? debouncedQueue.enqueueRemoval(item)
          : debouncedQueue.enqueueAddOrUpdate(item)
      }
    }
  }

  // Listen to socket events when available.
  service.on('created', (item: any) => {
    handleEvent('created', item, 'addOrUpdate')
    Model.emit && Model.emit('created', item)
  })
  service.on('updated', (item: any) => {
    handleEvent('updated', item, 'addOrUpdate')
    Model.emit && Model.emit('updated', item)
  })
  service.on('patched', (item: any) => {
    handleEvent('patched', item, 'addOrUpdate')
    Model.emit && Model.emit('patched', item)
  })
  service.on('removed', (item: any) => {
    handleEvent('removed', item, 'removeFromStore')
    Model.emit && Model.emit('removed', item)
  })

  return debouncedQueue
}
