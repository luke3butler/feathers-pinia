---
outline: deep
---

<script setup>
import BlockQuote from '../components/BlockQuote.vue'
import V2Block from '../components/V2Block.vue'
</script>

<V2Block />

# useClones

<BlockQuote type="danger" label="🚧 this page not yet updated 🚧">

These docs haven't been updated yet. See examples of the new API in the [Migrate from 0.x](/guide/migrate-from-v0#useclones-api-change) page.

</BlockQuote>

[[toc]]

The `useClones` utility makes working with form data easier. It provides the following features in a fairly smart way:

- [Automatic diffing](#automatic-patch-diffing) for `patch` requests. Only send the data to the server that has actually changed.
- The clone and commit pattern runs under the hood, keeping calls to store actions to a minimum.
- Eager updates with full control over whether data gets committed to store or saved to the server.
- Work with temp records or records already in the store.
- Flexible, developer friendly ways to [call the save handlers](#diff-a-single-property).

## Basic Setup

The `useClones` utility is exported directly from `feathers-pinia`. It expects to receive a components `props` object or any object with model instances at the top level. It returns an object with two properties:

- `clones` is an object which will contain a key matching that of every Model instance found in the original `props`. In the below example, if a User instance is passed in the `props`, the `clones` object will contain `clones.user`.
- `saveHandlers` contains a function for each of the items in `clones`. the name of the function is the same as the original prop, but prefixed with `save_`. In the below example, notice the `save_user` function.

```vue
<template>
  <div>
    <input
      v-model="clones.user.name"
      type="text"
      placeholder="Enter the User's Name"
      @keyup.enter="() => save_user()"
    >
    <button @click="() => save_user()">
      Save
    </button>
  </div>
</template>

<script setup lang="ts">
import { useClones } from 'feathers-pinia'

const props = defineProps({
  user: { type: Object },
})

const { clones, saveHandlers } = useClones(props)
const { save_user } = saveHandlers
</script>
```

## Automatic Patch Diffing

The saveHandlers change their behavior depending on the first argument you provide. The first argument determines which keys get compared between the original item and the clone to check if a request should be sent to the API server.

If no values changed, the underlying promise will immediately resolve with the data, behaving the same as if a successful response to the API server was completed.

### Diff Everything

When no first argument is provided, or `undefined` is explicitly passed, **save_user()** will compare all of the clone's keys with the original record.

```ts
// Only sends a request if any property changed
await save_user()
```

### Diff a Single Property

When a string is provided as the first argument, the named property on the original and clone objects will be compared. Dotted paths can be used for values nested inside of objects. The dotted string will be used to compare the deeply-nested values. **The entire top-level object will be sent to the server.**

```ts
// Only sends a request if the user's `name` changed
await save_user('name')

// Only sends a request if the user's `profile.photo` changed
await save_user('profile.photo')
```

### Diff an Array of Properties

When an array of property names is provided, all properties are compared between the original and clone. The same rules apply as in the previous example, so deep-nested values are compared, but the entire top-level of the object is sent.

```ts
// Only sends a request if either property changed
await save_user(['name', 'profile.photo'])
```

### Diff an Object

You can also directly pass an object to a saveHandler. The provided object will commited to the clone then compared with the original.

```ts
// Commits all values to the clone, then sends a request if clone differs from original
await save_user({ name: 'Marshall', isHappy: true })
```

## `save_handlers` API

`save_item(propOrCollection, params)`

- **`propOrCollection`** {String, String[], Object} As described in detail in the [section about automatic patch diffing](#automatic-patch-diffing).
- **`params`** {Object}  [params](#params) allows customizing options for every request.

All save_handlers [return a consistently-resolved promise](#return-values).

### Params

Each saveHandler also accepts an `options` object as its second argument. The following options are available:

- **`**commit {Boolean}**`** whether to call clone.commit() before saving. default: true
- **`**diff {Boolean}**`** whether to auto-diff and only save changed properties. See the details, below. default: true
- **`**save { Boolean}**`** whether to call save if item[prop] and clone[prop] are not equal. default: true
- **`**saveWith {Function}**`** a function which receives the the original `item`, the `clone`, the changed `data`, and the `pick` method from feathers. The return value from `saveWith` should be an object. The returned object will be merged into the patch data.

Note, the above options will not go out in the request, since they are omitted, internally.  Any other keys inside `params` will be sent out with the request.  This allows you to use utilities like [paramsForServer](https://feathers-graph-populate.netlify.app/getting-started.html#enable-custom-client-side-params) from feathers-graph-populate to send additional, custom query params to the server.

```ts
import { useClones } from 'feathers-pinia'

const props = defineProps({
  user: { type: Object },
})

const { clones, saveHandlers } = useClones(props)
const { save_user } = saveHandlers

clones.user.name = 'Deku'

// Pass params as the second argument.
save_user(undefined, { $populateParams: { name: 'withRelatedQuirks' } })
```

### Return Values

Each save_handler returns a promise. Any successful request conforms to `Promise<SaveHandlerReturn>`.

```ts
interface SaveHandlerReturn {
  areEqual: boolean
  wasDataSaved: boolean
  item: ApiResult
}
```

This response will be different depending on if a request was actually made.

- `areEqual` will return the result of the internal `lodash.isEqual`, regardless of whether data was sent to the server.
- `wasDataSaved` will be `true` if an API request was made.
- `item` will be either (A) the response from the API server if a request was made, or (B) the original item from the store (original item as in not the clone).

## Using with Temp Records

The `useClones` utility supports temp records (instances which aren't yet in the store OR don't have an `idField` property). Keep in mind that once temp records have been saved, they get moved in the state from `tempsById` to `itemsById`. This means that you may need to make an adjustment to obtain the correct data after saving a temp. For example, instead of passing the temp record to the `user` in the first example, the correct record retrieved from the store's `itemsById` would need to be provided after saving.

An example of this behavior can be seen in the `vitesse-feathers-pinia` project on Github. The `/users/new` page allows creating a user, then upon creation the app redirects to the `/user/[userId]` page which uses the same component, but with the correct `user` record passed in.

## Diffing Data for Patch/Update

Each `save_handler` supports automated diffing when called with no arguments. Logically, diffing does not work for `create` requests. There must be a baseline against which to compare. This means`patch` and `update` requests can support diffing, but you probably only want to use it for `patch`. (Technically, nothing prevents you from using it for `update` requests. If you find a valid use case, come share it on Slack 🤓)

In the example code, below, assume that a `user` instance with 10 keys has been provided to the `user` prop.

```js
const { clones, saveHandlers } = useClones(props)
const { save_user } = saveHandlers

clones.user.name = 'Edited Name'

// Only saves the `name` that changed
save_user()

// Set `diff` to false to send the entire object.
save_user(undefined, { diff: false })
```

Note that under the hood lodash's `isEqual` is being run against each top-level key in the object. While looping through and comparing dep objects is not typically a high performance operation, it's _usually_ fine for moderate-frequency requests or shallow objects, which is the purpose of `useClones`.

If you somehow find yourself in a position where you need to save 10+ highly-complex model instances all at once, you might consider **manually** specifying data to save by passing an array of key names or an object:

```js
const { clones, saveHandlers } = useClones(props)
const { save_user, save_other, save_another, save_etc } = saveHandlers

/* suppose you make a bunch of changes to all of the values */

// Maybe this is performant, depending on data structure, processor speed, browser conditions, what the user had for breakfast.
save_user()
save_other()

// You might consider manually specifying which props have changed, if plausible in your app.
save_user({ foo: true }) // only this data gets sent
save_other(['foo']) // only these keys from the clone get `picked` and sent
```
