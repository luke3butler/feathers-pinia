import type { Params, Paginated, QueryInfo, HandleEvents } from '../types'
import type { Ref, ComputedRef } from 'vue-demi'
import type { Id, Query, NullableId, Application as FeathersClient } from '@feathersjs/feathers'
import type { StateTree, Store as _Store, StoreDefinition, _GettersTree, DefineStoreOptionsBase } from 'pinia'
import type { MaybeArray, MaybeRef, TypedActions, TypedGetters } from '../utility-types'
import { BaseModel } from './base-model'
import { Find } from '../use-find'
import { Get } from '../use-get'

export type RequestTypeById = 'create' | 'patch' | 'update' | 'remove'
export type RequestTypeModel = 'find' | 'count' | 'get'

type PendingById = {
  [key in RequestTypeById]: boolean
}
type PendingByModel = {
  [key in RequestTypeModel]: boolean
}

export type RequestType = RequestTypeModel & RequestTypeById

export type AnyData = Record<string, any>
export type AnyDataOrArray = MaybeArray<AnyData>

type ModelsById<M> = { [id: string | number]: M }

interface QueryPagination {
  $limit: number
  $skip: number
}
interface MostRecentQuery {
  pageId: string
  pageParams: QueryPagination
  queriedAt: number
  query: Query
  queryId: string
  queryParams: Query
  total: number
}

export interface CurrentQuery<M extends BaseModel> extends MostRecentQuery {
  qid: string
  ids: number[]
  items: M[]
  total: number
  queriedAt: number
  queryState: PaginationStateQuery
}

/**
 * Pagination State Types: below are types for the basic format shown here.
 * I'm surprised that something like the below can't work in TypeScript. Instead,
 * it has to be spread across the jumbled mess of interfaces and types shown below.
 * If somebody has knowledge of a cleaner representation, I'd appreciate a PR. - Marshall
 *
 * interface PaginationState {
 *   [queryId: string]: {
 *     [pageId: string]: {
 *       ids: Id[]
 *       pageParams: QueryPagination
 *       queriedAt: number
 *       ssr: boolean
 *     }
 *     queryParams: Query
 *     total: number
 *   }
 *   mostRecent: MostRecentQuery
 * }
 */
export interface PaginationPageData {
  ids: Id[]
  pageParams: QueryPagination
  queriedAt: number
  ssr: boolean
}
export type PaginationStatePage = {
  [pageId: string]: PaginationPageData
}
export type PaginationStateQuery =
  | PaginationStatePage
  | {
      queryParams: Query
      total: number
    }
export type PaginationStateQid =
  | PaginationStateQuery
  | {
      mostRecent: MostRecentQuery
    }

export type ServiceStoreSharedStateDefineOptions = {
  clientAlias: string
  servicePath: string
  idField: string
  tempIdField: string
  whitelist: string[]
  paramsForServer: string[]
  skipRequestIfExists: boolean
}

export type ServiceStoreDefault<M extends BaseModel> = _Store<
  string,
  ServiceStoreDefaultState<M>,
  ServiceStoreDefaultGetters<M>,
  ServiceStoreDefaultActions<M>
>

export type ServiceStoreDefaultState<M extends BaseModel = BaseModel> = ServiceStoreSharedStateDefineOptions & {
  pagination: {
    [qid: string]: PaginationStateQid
  }
  itemsById: ModelsById<M>
  tempsById: ModelsById<M>
  clonesById: ModelsById<M>
  pendingById: {
    Model: PendingByModel
    [id: string]: PendingById | PendingByModel
    [id: number]: PendingById
  }
  eventLocksById: {
    created: ModelsById<M>
    patched: ModelsById<M>
    updated: ModelsById<M>
    removed: ModelsById<M>
  }
}

export interface ServiceStoreDefaultGetters<M extends BaseModel = BaseModel> {
  service: () => any
  Model: () => ModelStatic<M>
  isSsr: () => boolean
  itemIds: () => Id[]
  items: () => M[]
  tempIds: () => string[]
  temps: () => M[]
  cloneIds: () => Id[]
  clones: () => M[]
  findInStore: () => (params: Params) => Paginated<M>
  countInStore: () => (params: Params) => number
  getFromStore: () => (id: Id | null, params?: Params) => M | undefined
  isCreatePending: () => boolean
  isPatchPending: () => boolean
  isUpdatePending: () => boolean
  isRemovePending: () => boolean
}

export type HandleFindResponseOptions = { params: Params; response: any }
export type HandleFindErrorOptions = { params: Params; error: any }

// The find action will always return data at params.data, even for non-paginated requests.
export type FindFn<M extends BaseModel> = (params?: MaybeRef<Params>) => Promise<Paginated<M>>
export type GetFn<M extends BaseModel> = (id?: Id, params?: MaybeRef<Params>) => Promise<M | undefined>
export type GetFnWithId<M extends BaseModel> = (id: Id, params?: MaybeRef<Params>) => Promise<M | undefined>
export type UseGetFn<M extends BaseModel> = (_id: MaybeRef<Id | null>, _params?: MaybeRef<GetClassParams>) => Get<M>

export interface ServiceStoreDefaultActions<M extends BaseModel = BaseModel> {
  find: FindFn<M>
  handleFindResponse: (findResponse: HandleFindResponseOptions) => Promise<any>
  afterFind: <T = M[] | Paginated<M>>(response: T) => Promise<T>
  handleFindError({ params, error }: HandleFindErrorOptions): Promise<any>
  count: (params?: MaybeRef<Params>) => number
  get: GetFnWithId<M>
  create(data: AnyData, params?: MaybeRef<Params>): Promise<M>
  create(data: AnyData[], params?: MaybeRef<Params>): Promise<M[]>
  update: (id: Id, data: AnyData, params?: MaybeRef<Params>) => Promise<M>
  patch: (id: NullableId, data: AnyData, params?: MaybeRef<Params>) => Promise<M>
  remove: (id: NullableId, params?: Params) => any
  removeFromStore<T extends AnyData>(data: T): T
  removeFromStore<T extends AnyData[]>(data: T[]): T[]
  addToStore(data: AnyData): M
  addToStore(data: AnyData[]): M[]
  addOrUpdate(data: AnyData): M
  addOrUpdate(data: AnyData[]): M[]
  moveTempToItems(data: AnyData): M
  clearAll: () => void
  clone: (item: M, data: AnyData, options?: CloneOptions) => M
  commit: (item: M) => M | undefined
  reset: (item: M, data: AnyData) => M | undefined
  updatePaginationForQuery: (options: UpdatePaginationForQueryOptions) => void
  setPendingById(id: 'Model', method: RequestTypeModel, val: boolean): void
  setPendingById(id: NullableId, method: RequestTypeById, val: boolean): void
  hydrateAll: () => void
  toggleEventLock: (idOrIds: MaybeArray<Id>, event: string) => void
  unflagSsr: (params: Params) => void
  useFind: (params: MaybeRef<FindClassParams>) => Find<M>
  useFindWatched: (options: UseFindWatchedOptions) => UseFindComputed<M>
  useGet: UseGetFn<M>
  useGetOnce: UseGetFn<M>
  useGetWatched: (options: UseGetOptions) => UseGetComputed<M>
}

export type ServiceOptions<
  Id extends string = any,
  M extends BaseModel = BaseModel,
  S extends StateTree = {},
  G extends _GettersTree<S> = {},
  A = {},
> = Required<
  Pick<
    DefineFeathersStoreOptions<Id, M, S, G, A>,
    | 'ssr'
    | 'clients'
    | 'id'
    | 'clientAlias'
    | 'idField'
    | 'tempIdField'
    | 'servicePath'
    | 'Model'
    | 'state'
    | 'getters'
    | 'actions'
    | 'whitelist'
    | 'paramsForServer'
    | 'skipRequestIfExists'
  >
>

export type MakeStateOptions<M extends BaseModel = BaseModel, S extends StateTree = {}> = Pick<
  ServiceOptions<any, M, S>,
  | 'servicePath'
  | 'clientAlias'
  | 'idField'
  | 'tempIdField'
  | 'state'
  | 'whitelist'
  | 'paramsForServer'
  | 'skipRequestIfExists'
>

export type MakeServiceGettersOptions<
  M extends BaseModel = BaseModel,
  S extends StateTree = {},
  G extends _GettersTree<S> = {},
> = Pick<ServiceOptions<any, M, S, G>, 'Model' | 'getters' | 'clients' | 'ssr'>

export type MakeServiceActionsOptions<
  M extends BaseModel = BaseModel,
  S extends StateTree = {},
  G extends _GettersTree<S> = {},
  A = {},
> = Pick<ServiceOptions<any, M, S, G, A>, 'Model' | 'getters' | 'clients' | 'ssr' | 'actions'>

export interface Association {
  name: string
  Model: ModelStatic<BaseModel>
  type: 'find' | 'get'
}
export type BaseModelAssociations = Record<string, Association>

/** Model instance interface */
// export interface Model {
//   /**
//    * model's temporary ID
//    */
//   readonly __id?: string
//   /**
//    * model is temporary?
//    */
//   readonly __isTemp?: boolean
//   /**
//    * model is a clone?
//    */
//   readonly __isClone?: boolean

//   /**
//    * `Create` is currently pending on this model
//    */
//   readonly isCreatePending: boolean
//   /**
//    * `Update` is currently pending on this model
//    */
//   readonly isUpdatePending: boolean
//   /**
//    * `Patch` is currently pending on this model
//    */
//   readonly isPatchPending: boolean
//   /**
//    * `Remove` is currently pending on this model
//    */
//   readonly isRemovePending: boolean
//   /**
//    * Any of `create`, `update` or `patch` is currently pending on this model
//    */
//   readonly isSavePending: boolean
//   /**
//    * Any method is currently pending on this model
//    */
//   readonly isPending: boolean

//   /**
//    * Creates a deep copy of the record and stores it on
//    * `Model.clonesById`. This allows you to make changes
//    * to the clone and not update visible data until you
//    * commit or save the data.
//    * @param data Properties to modify on the cloned instance
//    */
//   clone(data?: AnyData): this
//   /**
//    * The create method calls the create action (service method)
//    * using the instance data.
//    * @param params Params passed to the Feathers client request
//    */
//   create(params?: Params): Promise<this>
//   /**
//    * The patch method calls the patch action (service method)
//    * using the instance data. The instance's id field is used
//    * for the patch id.
//    *
//    * You can provide an object as `params.data`, and Feathers-Pinia
//    * will use `params.data` as the patch data. This allows patching
//    * with partial data.
//    * @param params Params passed to the Feathers client request
//    */
//   patch<D extends AnyData>(params?: PatchParams<D>): Promise<this>
//   /**
//    * The remove method calls the remove action (service method)
//    * using the instance data. The instance's id field is used
//    * for the remove id.
//    * @param params Params passed to the Feathers client request
//    */
//   remove(params?: Params): Promise<this>
//   /**
//    * The update method calls the update action (service method)
//    * using the instance data. The instance's id field is used for
//    * the update id.
//    * @param params Params passed to the Feathers client request
//    */
//   update(params?: Params): Promise<this>
//   /**
//    * The save method is a convenience wrapper for the create/patch
//    * methods, by default. If the records has no id, the
//    * instance.create() method will be used.
//    * @param params Params passed to the Feathers client request
//    */
//   save(params?: Params): Promise<this>

//   /**
//    * Commit changes from clone to original
//    */
//   commit(): this

//   /**
//    * Discards changes made on this clone and syncs with the original
//    */
//   reset(): this
// }

type NonConstructorKeys<T> = { [P in keyof T]: T[P] extends new () => any ? never : P }[keyof T]
type NonConstructor<T> = Pick<T, NonConstructorKeys<T>>

export type ModelStatic<M extends BaseModel = BaseModel> = NonConstructor<typeof BaseModel> & {
  new (...args: any[]): M
}

/** Static Model interface */
// export interface ModelStatic extends EventEmitter {
//   /**
//    * The path passed to `FeathersClient.service()` to create the service
//    */
//   servicePath: string

//   /**
//    * The pinia store
//    */
//   readonly store: any

//   /**
//    * The global models object
//    */
//   readonly object: Record<string, ModelStatic<BaseModel>>

//   /**
//    * The field in each record that will contain the ID
//    */
//   idField: string

//   /**
//    * The client alias in the global `models` object
//    */
//   clientAlias: string

//   /**
//    * Model name used to circumvent Babel transpilation errors
//    */
//   modelName: string

//   /**
//    * All model copies created using `model.clone()`
//    */
//   readonly clonesById: { [id: string | number]: Model | undefined }

//   /**
//    * Create new Model
//    * @param data partial model data
//    * @param options model instance options
//    */
//   new (data?: AnyData, options?: ModelInstanceOptions): Model
//   prototype: Model

//   /**
//    * The instanceDefaults API prevents requiring to specify data for new
//    * instances created throughout the app. Depending on the complexity of the
//    * service's "business logic", it can save a lot of boilerplate. Notice that
//    * it is similar to the setupInstance method added in 2.0. The instanceDefaults
//    * method should ONLY be used to return default values for a new
//    * instance. Use setupInstance to handle other transformations on
//    * the data.
//    * @param data the instance data
//    */
//   instanceDefaults(data: AnyData): AnyData

//   /**
//    * The setupInstance method allows you to transform the data and setup the
//    * final instance based on incoming data. For example, you can access the
//    * models object to reference other service Model classes and create
//    * data associations.
//    * @param data the instance data
//    * @param ctx setup context
//    */
//   setupInstance(data: AnyData): AnyData

//   /**
//    * A proxy for the `find` action
//    * @param params Find params
//    */
//   find<M extends Model = Model>(params?: Params): Promise<M[] | Paginated<M>>

//   /**
//    * A proxy for the `findInStore` getter
//    * @param params Find params
//    */
//   findInStore<M extends Model = Model>(params?: Params | Ref<Params>): Paginated<M>

//   /**
//    * A proxy for the `count` action
//    * @param params Find params
//    */
//   count(params?: Params): Promise<number>

//   /**
//    * A proxy for the `countInStore` getter
//    * @param params Find params
//    */
//   countInStore(params?: Params | Ref<Params>): number

//   /**
//    * A proxy for the `get` action
//    * @param id ID of record to retrieve
//    * @param params Get params
//    */
//   get<M extends Model = Model>(id: Id, params?: Params): Promise<M | undefined>

//   /**
//    * A proxy for the `getFromStore` getter
//    * @param id ID of record to retrieve
//    * @param params Get params
//    */
//   getFromStore<M extends Model = Model>(
//     id: Id | Ref<Id>,
//     params?: Params | Ref<Params>,
//   ): M | undefined

//   /**
//    * Add a item to the pinia store
//    * @param data item to add to store
//    */
//   addToStore<M extends Model = Model>(
//     data: AnyData
//   ): M

//   /**
//    * Add multiple items to the pinia store
//    * @param data items to add to store
//    */
//   addToStore<M extends Model = Model>(
//     data: AnyData[]
//   ): M[]

//   /**
//    * A proxy for the `update` action
//    * @param id ID of item
//    * @param data data to update
//    * @param params update params
//    */
//   update<M extends Model = Model>(id: Id, data: any, params?: Params): Promise<M>

//   /**
//    * A proxy for the `patch` action
//    * @param id ID of item or null
//    * @param data data to patch
//    * @param params patch params
//    */
//   patch<M extends Model = Model>(id: NullableId, data: any, params?: Params): Promise<M>

//   /**
//    * A proxy for the `remove` action
//    * @param id ID of item or null
//    * @param params remove params
//    */
//   remove(id: NullableId, params?: Params): Promise<any>

//   /**
//    * A proxy for the `removeFromStore` action
//    * @param data data to remove from store
//    */
//    remove<T extends AnyDataOrArray = AnyDataOrArray>(data: T): T
// }

export interface UpdatePaginationForQueryOptions {
  qid: string
  response: any
  query: any
  preserveSsr: boolean
}

export interface ModelInstanceOptions {
  /**
   * is creating clone
   */
  clone?: boolean
}

export interface BaseModelModifierOptions {
  models: Record<string, any>
  store: any
}

export interface CloneOptions {
  useExisting?: boolean
}

export interface UseCloneOptions {
  useExisting?: boolean
  deep?: boolean
}

export interface QueryWhenContext {
  items: ComputedRef<AnyData[]>
  queryInfo: QueryInfo
  /**
   * Pagination data for the current qid
   */
  qidData: PaginationStateQid
  queryData: PaginationStateQuery
  pageData: PaginationStatePage
  isPending: ComputedRef<Boolean>
  haveBeenRequested: ComputedRef<Boolean>
  haveLoaded: ComputedRef<Boolean>
  error: any
}

export type QueryWhenFunction = ComputedRef<(context: QueryWhenContext) => boolean>

export type ServiceStore<
  Id extends string = string,
  M extends BaseModel = BaseModel,
  S extends StateTree = {},
  G extends _GettersTree<S> = {},
  A = {},
> = _Store<Id, ServiceStoreDefaultState<M> & S, ServiceStoreDefaultGetters<M> & G, ServiceStoreDefaultActions<M> & A>

export type ServiceStoreDefinition<
  Id extends string,
  M extends BaseModel,
  S extends StateTree = {},
  G extends _GettersTree<S> = {},
  A = {},
> = StoreDefinition<
  Id,
  ServiceStoreDefaultState<M> & S,
  ServiceStoreDefaultGetters<M> & G,
  ServiceStoreDefaultActions<M> & A
>

export interface DefineFeathersStoreOptions<Id extends string, M extends BaseModel, S extends StateTree, G, A>
  extends DefineStoreOptionsBase<S, _Store<Id, S, G, A>> {
  clientAlias?: string
  idField?: string
  tempIdField?: string
  whitelist?: string[]
  paramsForServer?: string[]
  skipRequestIfExists?: boolean
  ssr?: boolean
  servicePath: string
  Model?: ModelStatic<M>
  clients?: { [alias: string]: FeathersClient }
  enableEvents?: boolean
  handleEvents?: HandleEvents<M>
  debounceEventsTime?: number
  debounceEventsGuarantee?: boolean
  id?: Id
  state?: () => S
  getters?: TypedGetters<S, G, ServiceStoreDefaultState>
  actions?: TypedActions<S, G, A, ServiceStoreDefaultState, ServiceStoreDefaultGetters, ServiceStoreDefaultActions>
}

export interface GetClassParams extends Params {
  query?: Query
  onServer?: boolean
  immediate?: boolean
}
export interface GetClassParamsStandalone<M extends BaseModel> extends GetClassParams {
  store: ServiceStoreDefault<M>
}
export interface FindClassParams extends Params {
  query: Query
  onServer?: boolean
  qid?: string
  immediate?: boolean
  watch?: boolean
}
export interface FindClassParamsStandalone<M extends BaseModel> extends FindClassParams {
  store: ServiceStoreDefault<M>
}

export interface UseFindWatchedOptions {
  params: Params | ComputedRef<Params | null>
  fetchParams?: ComputedRef<Params | null | undefined>
  queryWhen?: ComputedRef<boolean> | QueryWhenFunction
  qid?: string
  local?: boolean
  immediate?: boolean
}
export interface UseFindWatchedOptionsStandalone<M extends BaseModel> extends UseFindWatchedOptions {
  model: ModelStatic<M>
}
export interface UseFindState {
  debounceTime: null | number
  qid: string
  isPending: boolean
  haveBeenRequested: boolean
  haveLoaded: boolean
  error: null | Error
  latestQuery: null | object
  isLocal: boolean
  request: Promise<any> | null
}
export interface UseFindComputed<M> {
  items: ComputedRef<M[]>
  servicePath: ComputedRef<string>
  paginationData: ComputedRef<AnyData>
  isSsr: ComputedRef<boolean>
}

export interface UseGetOptions {
  id: Ref<Id | null> | ComputedRef<Id | null> | null
  params?: Ref<Params>
  queryWhen?: Ref<boolean>
  local?: boolean
  immediate?: boolean
}
export interface UseGetOptionsStandalone<M extends BaseModel> extends UseGetOptions {
  model: ModelStatic<M>
}
export interface UseGetState {
  isPending: boolean
  hasBeenRequested: boolean
  hasLoaded: boolean
  error: null | Error
  isLocal: boolean
  request: Promise<any> | null
}
export interface UseGetComputed<M> {
  item: ComputedRef<M | null>
  servicePath: ComputedRef<string>
  isSsr: ComputedRef<boolean>
}

export interface AssociateFindUtils<M extends BaseModel> extends Find<M> {
  useFind: (params: MaybeRef<FindClassParams>) => Find<M>
}
