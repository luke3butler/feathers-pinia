import { createPinia } from 'pinia'
import { setupFeathersPinia } from '../src/index'
import { api } from './feathers'

const pinia = createPinia()

describe('whitelist', () => {
  test('adds whitelist to the state', async () => {
    const { defineStore } = setupFeathersPinia({
      clients: { api },
      whitelist: ['$regex'],
    })

    const useMessagesService = defineStore({ servicePath: 'messages' })
    const messagesService = useMessagesService(pinia)

    expect(messagesService.whitelist[0]).toBe('$regex')
  })

  test('find getter fails without whitelist', async () => {
    const { defineStore } = setupFeathersPinia({ clients: { api } })

    const useLettersService = defineStore({ servicePath: 'letters' })
    const lettersService = useLettersService(pinia)

    const fn = () => lettersService.findInStore({ query: { $regex: 'test' } })

    expect(fn).toThrowError()
  })

  test('enables custom query params for the find getter', async () => {
    const { defineStore } = setupFeathersPinia({
      clients: { api },
      whitelist: ['$regex'],
    })

    const useMessagesService = defineStore({ servicePath: 'messages' })
    const messagesService = useMessagesService(pinia)

    await messagesService.create({ text: 'test' })
    await messagesService.create({ text: 'yo!' })

    const data = messagesService.findInStore({
      query: {
        text: { $regex: 'test' },
      },
    }).data

    expect(Array.isArray(data)).toBeTruthy()
    expect(data[0].text).toBe('test')
  })

  test('retrieves custom query params ($options) from the service options', async () => {
    // The $options param is defined on the service in feathers.ts
    const { defineStore } = setupFeathersPinia({
      clients: { api },
      whitelist: ['$regex'],
    })

    const useMessagesService = defineStore({ servicePath: 'messages' })
    const messagesService = useMessagesService(pinia)

    await messagesService.create({ text: 'test' })
    await messagesService.create({ text: 'yo!' })

    const data = messagesService.findInStore({
      query: {
        text: { $regex: 'test', $options: 'igm' },
      },
    }).data

    expect(Array.isArray(data)).toBeTruthy()
  })
})
