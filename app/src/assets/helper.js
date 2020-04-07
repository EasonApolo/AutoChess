export function randInt (r, s=0) {
  return Math.floor(Math.random()*r)+s
}
export function removeFromArr (arr, obj) {
  arr.splice(arr.indexOf(obj), 1)
}
export function numberize (arr) {
  return arr.map(v=>Number(v))
}
export function findExistKey (arr, key, val) {
  for (let i in arr) {
    if (arr[i][key] === val) {
      return i
    }
  }
  return undefined
}