const { log, randInt } = require('./helper')
module.exports = {

  // users:   Object.entries(game.users)
  getPlayersInfo (users) {
    // destruct assignment
    const extract = (id, { hp, lvl, name }) => ({ id: id, hp, lvl, name })
    playersInfo = users.map((u_entry, index, arr ) => {
        return extract(...u_entry)
    })
    return playersInfo
  },

  // users:   Object.entries(game.users)
  setAllOppoIdx (users) {
    let idxes = users.map((u_entry, i, users) => {
      // filter dead
      if (u_entry[1].hp >= 0) {
        return i
      }
    })
    while(idxes.length > 0) {
      n = idxes.length
      a = randInt(n)
      b = randInt(n-1)
      if (b >= a) b += 1
      users[a][1].oppoIdx = b
      idxes.splice(a,1)
      // if odd, only assign a to mirror
      if (n % 2 == 0) {
        users[b][1].oppoIdx = a
        idxes.splice(b>a?b-1:b,1)
      }
    }
  }
}