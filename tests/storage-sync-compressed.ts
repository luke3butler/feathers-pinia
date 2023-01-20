import debounce from 'just-debounce'
import { _ } from '@feathersjs/commons'
import { computed, watch } from 'vue-demi'
import lz from 'lz-string'

// Writes data to localStorage
export function writeToStorage(id: string, data: any, storage: any) {
  const compressed = lz.compress(JSON.stringify(data))
  storage.setItem(id, compressed)
}

// Reads and decompresses data from localStorage
export function hydrateStore(store: any, storage: any) {
  const data = storage.getItem(store.$id)
  if (data) {
    const hydrationData = JSON.parse(lz.decompress(data) as string)
    Object.assign(store, hydrationData)
  }
}

/**
 *
 * @param store pinia store
 * @param keys an array of keys to watch and write to localStorage.
 */
export function syncWithStorageCompressed(
  store: any,
  stateKeys: Array<string> = [],
  storage: Storage = window.localStorage,
) {
  hydrateStore(store, storage)

  const debouncedWrite = debounce(writeToStorage, 500)
  const toWatch = computed(() => _.pick(store, ...stateKeys))

  watch(
    () => toWatch.value,
    (val) => {
      debouncedWrite(store.$id, val, storage)
    },
    { deep: true },
  )
}
