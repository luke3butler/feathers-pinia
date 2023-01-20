import { createEqualsOperation } from 'sift'

// Simulate SQL's case-sensitive LIKE.
// A combination of answers from https://stackoverflow.com/questions/1314045/emulating-sql-like-in-javascript
export function like(value: string, search: string, regexOptions = 'g') {
  const specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\']
  // Remove specials
  search = search.replace(new RegExp(`(\\${specials.join('|\\')})`, regexOptions), '\\$1')
  // Replace % and _ with equivalent regex
  search = search.replace(/%/g, '.*').replace(/_/g, '.')
  // Check matches
  return RegExp(`^${search}$`, regexOptions).test(value)
}

// Simulate PostgreSQL's case-insensitive ILIKE
export function iLike(str: string, search: string) {
  return like(str, search, 'ig')
}

export const $like = (params: any, ownerQuery: any, options: any) => {
  return createEqualsOperation((value: any) => like(value, params), ownerQuery, options)
}

export const $notLike = (params: any, ownerQuery: any, options: any) => {
  return createEqualsOperation((value: any) => !like(value, params), ownerQuery, options)
}

export const $ilike = (params: any, ownerQuery: any, options: any) => {
  return createEqualsOperation((value: any) => iLike(value, params), ownerQuery, options)
}

const $notILike = (params: any, ownerQuery: any, options: any) => {
  return createEqualsOperation((value: any) => !iLike(value, params), ownerQuery, options)
}

export const operations = {
  $like,
  $notLike,
  $ilike,
  $iLike: $ilike,
  $notILike,
}
