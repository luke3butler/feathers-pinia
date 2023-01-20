import { setupFeathersPinia, BaseModel } from '../src/index' // from 'feathers-pinia'
import { createPinia } from 'pinia'
import { api } from './feathers'
import { resetStores, timeout } from './test-utils'
import { Find, useFind } from '../src/use-find'
import { computed, ref } from 'vue-demi'

const pinia = createPinia()
const { defineStore } = setupFeathersPinia({ clients: { api } })

export class Message extends BaseModel {
  id: number
  text: string

  constructor(data: Partial<Message>, options: Record<string, any> = {}) {
    super(data, options)
    this.init(data)
  }
}

const useMessagesService = defineStore({ servicePath: 'messages', Model: Message })
const messageStore = useMessagesService(pinia)

const reset = () => {
  resetStores(api.service('messages'), messageStore)
}

beforeEach(async () => {
  reset()
  api.service('messages').store = {
    1: { id: 1, text: 'Moose' },
    2: { id: 2, text: 'moose' },
    3: { id: 3, text: 'Goose' },
    4: { id: 4, text: 'Loose' },
    5: { id: 5, text: 'Marshall' },
    6: { id: 6, text: 'David' },
    7: { id: 7, text: 'Beau' },
    8: { id: 8, text: 'Batman' },
    9: { id: 9, text: 'Flash' },
    10: { id: 10, text: 'Wolverine' },
    11: { id: 11, text: 'Rogue' },
    12: { id: 12, text: 'Jubilee' },
  }
})
afterEach(() => reset())

describe('useFind Factory Function', () => {
  test('can use `useFind` to get a Find instance', async () => {
    const params = {
      query: { text: 'Moose' },
      store: messageStore,
    }
    const returned = useFind(params)
    expect(returned instanceof Find).toBeTruthy()
    expect(returned.data.value).toBeDefined()
  })
})

describe('Find Class', () => {
  beforeEach(async () => {
    await messageStore.find({ query: { $limit: 20 } })
  })
  test('can pass plain params', async () => {
    const params = {
      query: { text: 'Moose' },
      store: messageStore,
    }
    const returned = new Find(params)
    expect(returned.data.value).toBeDefined()
  })

  test('changing returned params updates data', async () => {
    const _params = {
      query: { text: 'Moose' },
      store: messageStore,
    }
    const { params, data, total } = new Find(_params)
    expect(data.value.length).toBe(1)
    expect(total.value).toBe(1)
    expect(data.value[0].text).toBe('Moose')

    params.value.query.text = 'Goose'

    expect(data.value[0].text).toBe('Goose')
  })
})

describe('queryWhen', () => {
  test('use `queryWhen` to control queries', async () => {
    const { request, currentQuery, requestCount, queryWhen, next, prev } = new Find({
      query: { $limit: 3, $skip: 0 },
      store: messageStore,
      onServer: true,
      qid: 'test',
    })
    await request.value

    expect(requestCount.value).toBe(1)

    // run the query if we don't already have items.
    queryWhen(() => {
      if (!currentQuery.value || !currentQuery.value.items.length) {
        return true
      }
      return false
    })
    // The `watchParams` does not automatically trigger request
    expect(requestCount.value).toBe(1)

    await next()

    // Another request went out to get the next page.
    expect(requestCount.value).toBe(2)

    await prev()

    // Going back to a cached page so we didn't make another request.
    expect(requestCount.value).toBe(2)
  })

  test('does not make pagination requests when queryWhen is false', async () => {
    const { request, requestCount, queryWhen, next, prev } = new Find({
      query: { $limit: 3, $skip: 0 },
      store: messageStore,
      onServer: true,
      qid: 'test',
      immediate: false,
    })
    await request.value

    expect(requestCount.value).toBe(0)

    // run the query if we don't already have items.
    queryWhen(() => {
      return false
    })
    // The `watchParams` does not automatically trigger request
    expect(requestCount.value).toBe(0)

    await next()

    // Another request went out to get the next page.
    expect(requestCount.value).toBe(0)

    await prev()

    // Going back to a cached page so we didn't make another request.
    expect(requestCount.value).toBe(0)
  })
})

describe('External Control With Provided Params', () => {
  beforeEach(async () => {
    await messageStore.find({ query: { $limit: 20 } })
  })
  test('changing provided params updates data', async () => {
    const _params = ref({
      query: { text: 'Moose' },
      store: messageStore,
    })
    const { data, total } = new Find(_params)
    expect(data.value.length).toBe(1)
    expect(total.value).toBe(1)

    _params.value.query.text = 'Goose'

    expect(data.value[0].text).toBe('Goose')
  })
})

describe('Pagination Attributes', () => {
  beforeEach(async () => {
    await messageStore.find({ query: { $limit: 20 } })
  })
  test('limit and skip are undefined if pagination is not provided in the query', async () => {
    // Turn off service's pagination
    const oldPaginate = messageStore.service.options.paginate
    messageStore.service.options.paginate = false

    const _params = {
      query: { text: 'Moose' },
      store: messageStore,
    }
    const findData = new Find(_params)

    expect(findData.limit.value).toBeUndefined()
    expect(findData.skip.value).toBeUndefined()
    expect(findData.total.value).toBe(1)

    // Re-enable service's pagination
    messageStore.service.options.paginate = oldPaginate
  })

  test('pagination attributes enabled on the store', async () => {
    const _params = {
      query: { text: 'Moose' },
      store: messageStore,
    }
    const findData = new Find(_params)

    expect(findData.limit).toBeDefined()
    expect(findData.skip).toBeDefined()
    expect(findData.total).toBeDefined()
  })

  test('pagination attributes enabled in the query', async () => {
    // Turn off service's pagination
    const oldPaginate = messageStore.service.options.paginate
    messageStore.service.options.paginate = false

    const _params = {
      query: { text: 'Moose', $limit: 3, $skip: 0 },
      store: messageStore,
    }
    const findData = new Find(_params)

    expect(findData.limit).toBeDefined()
    expect(findData.skip).toBeDefined()
    expect(findData.total).toBeDefined()

    // Re-enable service's pagination
    messageStore.service.options.paginate = oldPaginate
  })
})

describe('Local Pagination', () => {
  beforeEach(async () => {
    await messageStore.find({ query: { $limit: 20 } })
  })
  test('query without $limit or $skip returns all data', async () => {
    const params = {
      query: {},
      store: messageStore,
    }
    const { data } = new Find(params)
    expect(data.value.length).toBe(12)
  })

  test('can page local data', async () => {
    const params = {
      query: { $limit: 3, $skip: 0 },
      store: messageStore,
    }
    const { data, next } = new Find(params)
    expect(data.value.length).toBe(3)
    expect(data.value.map((i) => i.id)).toEqual([1, 2, 3])

    await next()

    expect(data.value.length).toBe(3)
    expect(data.value.map((i) => i.id)).toEqual([4, 5, 6])
  })
})

describe('Server Pagination', () => {
  test('passing `onServer` enables server pagination', async () => {
    const params = {
      query: {},
      store: messageStore,
      onServer: true,
    }
    const query = new Find(params)
    expect(query.data.value.length).toBe(0)
    expect(query.onServer).toBeTruthy()
  })

  test('onServer with `immediate` immediately fetches data', async () => {
    const params = {
      query: { $limit: 3, $skip: 0 },
      store: messageStore,
      onServer: true,
    }
    const { request, requestCount } = new Find(params)
    const response = await request.value
    expect(response.data.length).toBe(3)
    expect(requestCount.value).toBe(1)
  })

  test('onServer, immediate: false does not immediately fetch data', async () => {
    const params = {
      query: { $limit: 3, $skip: 0 },
      store: messageStore,
      onServer: true,
      immediate: false,
    }
    const { request, requestCount } = new Find(params)
    expect(request.value).toBe(null)
    expect(requestCount.value).toBe(0)
  })

  test('server fetch without limit or skip sets both values based on the response', async () => {
    const params = {
      query: {},
      store: messageStore,
      onServer: true,
    }
    const { request, requestCount, limit, skip } = new Find(params)
    await request.value
    expect(requestCount.value).toBe(1)
    expect(limit.value).toBe(10)
    expect(skip.value).toBe(0)

    // Make sure a second request was not sent
    expect(requestCount.value).toBe(1)
  })

  test('paginate on server, immediate: false, passing no params uses the pagination params', async () => {
    const params = {
      query: { $limit: 3, $skip: 0 },
      store: messageStore,
      onServer: true,
      immediate: false,
    }
    const { data, requestCount, limit, skip, next, toEnd, pageCount, find } = new Find(params)
    await find()

    expect(data.value.map((i) => i.id)).toEqual([1, 2, 3])
    expect(requestCount.value).toBe(1)
    expect(limit.value).toBe(3)
    expect(skip.value).toBe(0)
    expect(pageCount.value).toBe(4)

    await next()
    expect(skip.value).toBe(3)

    // Make sure a second request was sent
    expect(requestCount.value).toBe(2)
    expect(data.value.map((i) => i.id)).toEqual([4, 5, 6])

    await toEnd()
    expect(skip.value).toBe(9)

    // Make sure a third request was sent
    expect(requestCount.value).toBe(3)
    expect(data.value.map((i) => i.id)).toEqual([10, 11, 12])
  })

  test('loading indicators during server pagination', async () => {
    const params = {
      query: { $limit: 3, $skip: 0 },
      store: messageStore,
      onServer: true,
    }
    const { isPending, haveBeenRequested, haveLoaded, request, skip, next } = new Find(params)
    expect(isPending.value).toBe(true)
    expect(haveLoaded.value).toBe(false)
    expect(haveBeenRequested.value).toBe(true)

    await request.value

    expect(isPending.value).toBe(false)
    expect(haveLoaded.value).toBe(true)
    expect(haveBeenRequested.value).toBe(true)

    await next()
    expect(skip.value).toBe(3)
  })

  test('errors populate during server pagination, manually clear error', async () => {
    // Throw an error in a hook
    let hasHookRun = false
    const hook = () => {
      if (!hasHookRun) {
        hasHookRun = true
        throw new Error('fail')
      }
    }
    api.service('messages').hooks({ before: { find: [hook] } })

    const params = {
      query: { $limit: 3, $skip: 0 },
      store: messageStore,
      onServer: true,
      immediate: false,
    }

    const { error, clearError, find } = new Find(params)
    expect(error.value).toBe(null)
    try {
      expect(await find()).toThrow()
    } catch (err: any) {
      expect(err.message).toBe('fail')
      expect(error.value.message).toBe('fail')

      clearError()

      expect(error.value).toBe(null)
    }
  })

  test('errors populate during server pagination, auto-clear error', async () => {
    // Throw an error in a hook
    let hasHookRun = false
    const hook = () => {
      if (!hasHookRun) {
        hasHookRun = true
        throw new Error('fail')
      }
    }
    api.service('messages').hooks({ before: { find: [hook] } })

    const params = {
      query: { $limit: 3, $skip: 0 },
      store: messageStore,
      onServer: true,
      immediate: false,
    }
    const { error, find } = new Find(params)
    expect(error.value).toBe(null)

    try {
      expect(await find()).toThrow()
    } catch (err: any) {
      expect(err.message).toBe('fail')
      expect(error.value.message).toBe('fail')

      await find()

      expect(error.value).toBe(null)
    }
  })

  test('onServer when server pagination is turned off', async () => {
    // Turn off service's pagination
    const oldPaginate = messageStore.service.options.paginate
    messageStore.service.options.paginate = false

    const params = {
      query: { $limit: 3, $skip: 0 },
      store: messageStore,
      onServer: true,
    }
    const { data, request, requestCount, limit, skip, next, toEnd, pageCount } = new Find(params)
    await request.value

    expect(data.value.map((i) => i.id)).toEqual([1, 2, 3])
    expect(requestCount.value).toBe(1)
    expect(limit.value).toBe(3)
    expect(skip.value).toBe(0)
    expect(pageCount.value).toBe(4)

    await next()
    expect(skip.value).toBe(3)
    await request.value

    // Make sure a second request was sent
    expect(requestCount.value).toBe(2)
    expect(data.value.map((i) => i.id)).toEqual([4, 5, 6])

    await toEnd()
    expect(skip.value).toBe(9)
    await request.value

    // Make sure a third request was sent
    expect(requestCount.value).toBe(3)
    expect(data.value.map((i) => i.id)).toEqual([10, 11, 12])

    // Re-enable service's pagination
    messageStore.service.options.paginate = oldPaginate
  })
})

describe('latestQuery and previousQuery', () => {
  test('onServer stores latestQuery and previousQuery', async () => {
    const params = {
      query: { $limit: 3, $skip: 0 },
      store: messageStore,
      onServer: true,
      immediate: false,
    }
    const { latestQuery, previousQuery, find, next } = new Find(params)

    expect(latestQuery.value).toBe(null)

    await find()

    const _firstQuery = {
      isOutdated: undefined,
      pageId: '{"$limit":3,"$skip":0}',
      pageParams: {
        $limit: 3,
        $skip: 0,
      },
      qid: 'default',
      query: {},
      queryId: '{}',
      queryParams: {},
      response: {
        data: [
          { id: 1, text: 'Moose' },
          { id: 2, text: 'moose' },
          { id: 3, text: 'Goose' },
        ],
        limit: 3,
        skip: 0,
        total: 12,
      },
    }

    expect(JSON.parse(JSON.stringify(latestQuery.value))).toEqual(_firstQuery)
    expect(previousQuery.value).toBe(null)

    await next()

    const _secondQuery = {
      pageId: '{"$limit":3,"$skip":3}',
      pageParams: {
        $limit: 3,
        $skip: 3,
      },
      qid: 'default',
      query: {},
      queryId: '{}',
      queryParams: {},
      response: {
        data: [
          { id: 4, text: 'Loose' },
          { id: 5, text: 'Marshall' },
          { id: 6, text: 'David' },
        ],
        limit: 3,
        skip: 3,
        total: 12,
      },
    }

    expect(JSON.parse(JSON.stringify(latestQuery.value))).toEqual(_secondQuery)
    expect(JSON.parse(JSON.stringify(previousQuery.value))).toEqual(_firstQuery)
  })

  describe('Has `allData`', () => {
    test('allData contains all stored data', async () => {
      const _params = {
        query: { $limit: 4, $skip: 0 },
        store: messageStore,
        onServer: true,
      }
      const { allData, find, next } = useFind(_params)
      await find()
      await next()
      expect(allData.value.length).toBe(8)
    })

    test('shows current data while loading new data', async () => {
      // A hook to cause a delay so we can check pending state
      let hasHookRun = false
      const hook = async () => {
        if (!hasHookRun) {
          hasHookRun = true
          await timeout(50)
        }
      }
      api.service('messages').hooks({ before: { find: [hook] } })

      const _params = {
        query: { $limit: 4, $skip: 0 },
        store: messageStore,
        onServer: true,
        immediate: false,
      }
      const { data, find, next, request, isPending } = useFind(_params)
      await find()

      const idsFromFirstPage = data.value.map((i) => i.id)
      expect(idsFromFirstPage).toEqual([1, 2, 3, 4])

      next()

      await timeout(0)

      expect(isPending.value).toBe(true)

      const idsWhilePending = data.value.map((i) => i.id)
      expect(idsWhilePending).toEqual(idsFromFirstPage)

      await request.value

      const idsAfterRequest = data.value.map((i) => i.id)
      expect(idsAfterRequest).not.toEqual(idsFromFirstPage)
      expect(idsAfterRequest).not.toEqual(idsWhilePending)
    })
  })
})

describe('Computed Params', () => {
  test('can use computed params, immediately sends request by default', async () => {
    const text = ref('Moose')
    const params = computed(() => {
      return {
        query: { text: text.value },
        store: messageStore,
        onServer: true,
      }
    })
    const { data, total, requestCount, request } = useFind(params)

    await request.value

    // requests are not sent by default
    expect(data.value.length).toBe(1)
    expect(requestCount.value).toBe(1)

    text.value = 'Goose'

    // Wait for watcher to run and the request to finish
    await timeout(20)
    await request.value

    // request was sent after computed params changed
    expect(requestCount.value).toBe(2)
    expect(total.value).toBe(1)
    expect(data.value[0].text).toBe('Goose')
  })

  test('computed params can start with limit and skip', async () => {
    const ids = ref([1, 2, 3, 4, 5, 6])
    const params = computed(() => {
      return {
        query: { id: { $in: ids.value }, $limit: 5, $skip: 0 },
        store: messageStore,
        onServer: true,
      }
    })
    const { params: _params, data, total, requestCount, request } = useFind(params)

    expect(_params.value.query.$limit).toBe(5)
    expect(_params.value.query.$skip).toBe(0)

    await request.value

    // requests are not sent by default
    expect(data.value.length).toBe(5)
    expect(requestCount.value).toBe(1)

    ids.value = [4, 5, 6, 7, 8, 9, 10]

    // Wait for watcher to run and the request to finish
    await timeout(20)
    await request.value

    // request was sent after computed params changed
    expect(data.value.length).toBe(5)
    expect(requestCount.value).toBe(2)
    // expect(total.value).toBe(5)
  })

  test.skip('return null from computed params to prevent a request', async () => {
    const params = computed(() => {
      // if (shouldQuery.value)
      return {
        query: { text: 'Moose' },
        store: messageStore,
        onServer: true,
      }
      // else return null
    })
    const { data, total, requestCount, request } = useFind(params)

    await request.value

    // requests are not sent by default
    expect(data.value.length).toBe(1)
    expect(requestCount.value).toBe(1)

    // Wait for watcher to run and the request to finish
    await timeout(20)
    await request.value

    // request was sent after computed params changed
    expect(requestCount.value).toBe(2)
    expect(total.value).toBe(1)
    expect(data.value[0].text).toBe('Goose')
  })
})
