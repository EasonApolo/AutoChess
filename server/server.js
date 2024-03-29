var express = require('express')
var app = express()
var expressWs = require('express-ws')(app);
var fs = require('fs').promises
var multer = require('multer')().single()
const assert = require('assert');
const f = require('./functions')
const {wsSend, randInt, log, json} = require('./helper')

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  next()
})
app.use(multer)

var rooms = [
  {"id":0,"stage":0,"users":[
    {"name":"e","id":0,"password":"1","online":true,"room":0},
    {"name":"a","id":1,"password":"1","online":true,"room":0}
  ]}]
var users = []
/*
  game: {
    turn: int,
    stage: 0|1,
    time: int,
    pool: [[]*n]*5,
    users: {
      id: {
        gold: int,
        exp: int,
        store: []*5,
        hp: int
      }
    }
  }
*/
var games = {}
function getRoom (rid) {
  return rooms.find(r => r.id == rid)
}
function getUser (uid) {
  return users.find(u => u.id == uid)
}


/*
  on Server Start
  */
async function loadUserInfo () {
  let userInfo
  try {
    userInfo = await fs.readFile(`./users.json`, 'utf-8')
    userInfo = JSON.parse(userInfo)
  } catch (err) {
    console.log(err)
  } finally {
    return userInfo
  }
}
loadUserInfo().then(userInfo => {
  // for testing, remove this map
  users = userInfo.map(u => { u.room = 0; return u })
  console.log(`loading userInfo OK with ${users.length} users`)
})


/*
  info
*/
app.get('/info', (req, res) => {
  let echo = json.bind(res)
  echo({rooms, users, games})
})


/*
  login
*/
app.post('/user/login', (req, res) => {
  let {name, password} = req.body
  let echo = json.bind(res)
  let user = users.find(v => v.name == name && v.password == password)
  if (user) {
    user.online = true
    echo({ user: user })
  } else {
    echo({ err: 'invalid name or password' })
  }
})
app.post('/user/signup', (req, res) => {
  let {name, password} = req.body
  let echo = json.bind(res)
  if (users.find(v => v.name == name)) {
    echo({err: 'username duplicated'})
  } else {
    let lastId = users.slice(-1).id
    let id = lastId == undefined ? 0 : lastId++
    let newUser = {name: name, id: id, password: password}
    console.log(`signup user: `, newUser)
    users.push(newUser)
    echo({user: newUser})
  }
})


/*
  room
*/
const MAX_N_PLAYERS = 2
var getNewRoomId = (function () {
  let id = 0
  return function () {
    return id++
  }
})()
function joinRoom (room, user) {
  if (room.users == undefined) room.users = []
  room.users.push(user)
  user.room = room.id
}
function quitRoom (room, user) {
  if (user.room == undefined) return
  let index = room.users.findIndex(u => u.id == user.id)
  if (index < 0) return
  room.users.splice(index, 1)
  user.room = undefined
}
app.post('/room/create', (req, res) => {
  let { uid } = req.body
  let user = getUser(uid)
  let room = { id: getNewRoomId(), stage: 0 }
  joinRoom(room, user)
  rooms.push(room)
  log(`CREAT: ${ user.name } create room ${ room.id }`)
  json({ room: room }, res)
})
app.post('/room/join', (req, res) => {
  let { rid, uid } = req.body
  let echo = json.bind(res)
  let room = getRoom(rid), user = getUser(uid)
  if (room == undefined) echo({ err: `no room id ${rid}` })
  if (room.users.length >= MAX_N_PLAYERS) {
    echo({ err: `room ${ rid } users full` })
  } else {
    joinRoom(room, getUser(uid))
    log(`JOIN: ${ user.name } create room ${ room.id }`)
    echo({ room: room })
  }
})
app.post('/room/exit', (req, res) => {
  let { uid } = req.body
  let user = getUser(uid)
  if (user.room != undefined) {
    let room = getRoom(user.room)
    quitRoom(room, getUser(uid))
    log(`QUIT: ${ user.name } quit room ${ room.id }`)
    // destroy room if no users
    if (room.users.length <= 0) {
      let index = rooms.findIndex(r => r.id == room.id)
      rooms.splice(index, 1)
      log(`DESTROY: ${ room.id } destroyed for NO USER`)
    }
  }
  json({ rooms: rooms }, res)
})
app.ws('/room/list', (ws, req) => {
  let send = () => ws.send(JSON.stringify(rooms))
  let interval = setInterval(send, 1000)
  ws.onmessage = send
  ws.onclose = () => {
    clearInterval(interval)
  }
})
app.ws('/room', (ws, req) => {
  let { rid } = req.query
  let room = getRoom(rid)
  let send = () => ws.send(JSON.stringify(room))
  let interval = setInterval(send, 1000)
  ws.onmessage = send
  ws.onclose = () => clearInterval(interval)
})


/*
  cards
*/
const CARD_ID = [
  [0,3,6,7,8,10,12,15,17,21,22],
  [1,14,16,20,27],
  [4,9,11,19,24,25,29,30,31,32],
  [5,13,23,28],
  [2,18,26]
]
const CARD_N = [
  5, // 39,
  4, // 26,
  3, // 18,
  2, // 13,
  1, // 10,
]
const DRAW_PROBS = [
  [100,   0,   0,   0,   0],
  [100,   0,   0,   0,   0],
  [ 70 , 25,   5,   0,   0],
  [ 55 , 30,  15,   0,   0],
  [ 35 , 35,  25,   5,   0],
  [ 25 , 35,  30,  10,   0],
  [ 24 , 28,  31,  15,   2],
  [ 20 , 24,  31,  20,   5],
  [ 10 , 15,  33,  30,  12],
]
function drawFromWhichLvl (lvl) {
  let probs = DRAW_PROBS[lvl]
  let v = randInt(100)
  for (let i in probs) {
    v -= probs[i]
    if (v < 0) return i
  }
}
// game.store: [id|null]*5
app.ws('/game/card', (ws, req) => {
  let { rid, uid } = req.query
  const N_DRAW = 5
  let game = games[rid], pool = game.pool, g_user = game.users[uid]
  let send = wsSend(ws)
  let putback = (cards) => {
    cards.map(c => {
      if (c.id) pool[c.lvl].push(c.id)
    })
  }
  let drawCards = () => {
    let drawn_all = new Array()
    for (let i = 0; i < N_DRAW; i++) {
      let draw_from_lvl = drawFromWhichLvl(g_user.lvl)
      let drawn = pool[draw_from_lvl].splice(randInt(pool[draw_from_lvl].length), 1)
      drawn_all = drawn_all.concat(drawn)
    }
    return drawn_all
  }
  // data = { id: cardId, lvl: 0-4 }
  ws.onmessage = e => {
    let data = JSON.parse(e.data)
    if (data.type == 'deal') {
      putback(data.cards)
      let drawn = drawCards()
      g_user.store = drawn
      log(`CARD: game ${ rid } | user ${ uid } DEAL`, drawn, 'game.pool now', pool.map(v => v.length))
      send(drawn)
    } else if (data.type == 'init') {
      let drawn, re = false
      if (g_user.store) {
        drawn = g_user.store
        re = true
      }
      else {
        drawn = drawCards()
        g_user.store = drawn
      }
      log(`CARD: game ${ rid } | user ${ uid } ${ re ? 'RE-' : '' }INIT with`, drawn, 'game.pool now', pool.map(v => v.length))
      send(drawn)
    } else if (data.type == 'buy') {
      g_user.store = data.cards.map(card => {
        return card.id == undefined ? null : card.id
      })
      log(`CARD: game ${ rid } | user ${ uid } BUY g_user.store now: `, g_user.store)
    } else if (data.type == 'sell') {
      putback(data.cards)
      log(`CARD: game ${ rid } | user ${ uid } PUTBACK game.pool now`, pool.map(v => v.length))
    }
  }
  log(`CARD: room ${ rid } | user ${ uid } ESTABLISHED`)
})
app.ws('/game/gold', (ws, req) => {
  let { rid, uid } = req.query
  const INIT_GOLD = 100
  let game = games[rid], g_user = game.users[uid]
  ws.onmessage = e => {
    if (e.data == 'init') {
      let initGold = g_user.gold == undefined ? INIT_GOLD : g_user.gold
      log(`GOLD: room ${ rid } | user ${ uid } INIT with ${ initGold }`)
      ws.send(initGold)
    } else {
      g_user.gold = parseInt(e.data)
      log(`GOLD: room ${ rid } | user ${ uid } UPDATE to ${ g_user.gold }`)
    }
  }
  log(`GOLD: room ${ rid } | user ${ uid } ESTABLISHED`)
})
app.ws('/game/chess', (ws, req) => {
  let { rid, uid } = req.query
  let game = games[rid], g_user = game.users[uid]
  let send = wsSend(ws)
  let count = arr => arr.reduce((n,c)=>n+(c.id>=0), 0)
  ws.onmessage = e => {
    let data = JSON.parse(e.data)
    if (data.type == 'update') {
      g_user.hand = data.hand
      g_user.board = data.board
      g_user.equips = data.equips
      log(`CHESS: room ${ rid } | user ${ uid } UPDATE hand ${ count(data.hand) }`)
    } else if (data.type == 'init') {
      if (g_user.hand && g_user.board && g_user.equips) {
        send({ hand: g_user.hand, board: g_user.board, equips: g_user.equips })
        log(`CHESS: room ${ rid } | user ${ uid } REINIT hand ${ count(g_user.hand) }`)
      }
    }
  }
})
app.ws('/game/exp', (ws, req) => {
  let { rid, uid } = req.query
  let game = games[rid], g_user = game.users[uid]
  let send = wsSend(ws)
  ws.onmessage = e => {
    let data = JSON.parse(e.data)
    if (data.type == 'update') {
      g_user.exp = data.exp
      g_user.lvl = data.lvl
      log(`CHESS: room ${ rid } | user ${ uid } UPDATE lvl ${ g_user.lvl } | exp ${ g_user.exp }`)
    } else if (data.type == 'init') {
      let flag_re = false
      if (g_user.exp != undefined && g_user.lvl != undefined) {
        flag_re = true
        send({ exp: g_user.exp, lvl: g_user.lvl })
      } else {
        g_user.exp = data.exp
        g_user.lvl = data.lvl
      }
      log(`EXP: room ${ rid } | user ${ uid } ${ flag_re ? 'RE' : '' }INIT lvl ${ g_user.lvl } | exp ${ g_user.exp }`)
    }
  }
})


/*
  Game Initialization
*/
function getCards () {
  let cards = new Array()
  for (let l in CARD_ID) {
    let cards_lvl = new Array()
    for (let i in CARD_ID[l]) {
      cards_lvl = cards_lvl.concat(new Array(CARD_N[l]).fill(CARD_ID[l][i]))
    }
    cards.push(cards_lvl)
  }
  return cards
}
app.post('/room/start', (req, res) => {
  let { rid } = req.body
  let room = getRoom(rid)
  if (room) {
    room.stage = 1
    let f_init_users = (obj, u) => {
      obj[u.id] = { lvl: 1, hp: 100, name: u.name }
      return obj
    }
    let new_game = { pool: getCards(), users: room.users.reduce(f_init_users, {}) }
    games[room.id] = new_game
    json({ room: room }, res)
    log(`START: game ${ room.id } | pool `, new_game.pool.map(pool_lvl => pool_lvl.length), )
  }
})


/*
  Game Main Thread
*/
const TIME_STAGE_0 = 15
app.ws('/game', (ws, req) => {
  let { rid, uid } = req.query
  let game = games[rid], g_user = game.users[uid]
  let users = Object.entries(game.users)  // users = [[uid, user], ...]
  g_user.ws = wsSend(ws)
  if (users.filter(([uid, user]) => !user.ws).length == 0) {
    main(game)
  }
  ws.onmessage = e => {
    let data = JSON.parse(e.data)
    if (data.type == 'over') {
      g_user.flag.over = true
      if (users.filter(([uid, user]) => !user.flag.over).length == 0) {
        users.map(([_, user]) => user.flag.over = false)
        game.turn += 1, game.stage = 0, game.time = TIME_STAGE_0    
      }
    }
  }
})
function main (game) {
  game.turn = 0, game.stage = 0, game.time = TIME_STAGE_0
  let users = Object.entries(game.users)
  let timer = undefined
  let workflow = () => {
    if (game.stage == 0) {
      if (game.time == TIME_STAGE_0) {
        playersInfo = f.getPlayersInfo(users)
        users.map(([_, user]) => {
          user.ws({ type: 'updatePlayersInfo', playersInfo })
          user.ws({ type: 'turn', turn: game.turn, stage: game.stage, time: game.time })
        })
        game.time --
      }
      if (game.time <= 0) {
        game.stage = 1
        f.setAllOppoIdx(users)
        users.map(([_, user], idx) => {
          let oppo_idx = user.oppoIdx
          user.ws({
            type: 'turn', turn: game.turn, stage: game.stage, time: game.time,
            oppo: { idx: oppo_idx, board: users[oppo_idx] }
          })
        })
      } else {
        game.time --
      }
    }
  }
  timer = setInterval(workflow, 1000)
}


/*
  Game data
*/
// getEnemyId = (stage, id, len) => {    // stage start from 0
//   let tmp = (id+stage)%(len-1)
//   if (tmp >= id) tmp++
//   return tmp
// }
// app.post('/data/start', (req, res) => {
//   let id = req.body.roomid
//   let name = req.body.name
//   let data = req.body.data
//   let [i, j, _] = getUser(id, name)
//   if (i) {
//     rooms[i].users[j].data = data
//     let enemyId = getEnemyId(rooms[i].stage, j, rooms[i].users.length)
//     new Promise(resolve => {
//       let intervalID = setInterval(() => {
//         let flag = true
//         for (let k in rooms[i].users) {
//           if (!rooms[i].users[k].data) {
//             flag=false;break;
//           }
//         }
//         if (flag) {
//           clearInterval(intervalID)
//           resolve()
//         }
//       }, 100)
//     }).then(() => res.end(JSON.stringify(rooms[i].users[enemyId])))
//   }
// })
// app.post('/data/end', (req, res) => {
//   let id = req.body.roomid
//   let name = req.body.name
//   let hp = req.body.hp
//   let [i, j, _] = getUser(id, name)
//   if (i) {
//     rooms[i].users[j].hp = hp
//     rooms[i].users[j].end=true
//     let stage = rooms[i].stage
//     let userdata = JSON.stringify(rooms[i].users[j])
//     new Promise(resolve => {
//       let intervalID = setInterval(() => {
//         if (rooms[i].stage != stage) resolve()
//         if (rooms[i].users.findIndex(v => !v.end) < 0) {
//           rooms[i].stage ++
//           for (let k in rooms[i].users) {
//             rooms[i].users[k].end = false
//             rooms[i].users[k].data = undefined
//           }
//           clearInterval(intervalID)
//           resolve()
//         }
//       }, 100)
//     }).then(() => res.end(userdata))
//   }
// })


/*
  Start Server
*/
var server = app.listen(81, () => {
  var host = server.address().address
  var port = server.address().port
  console.log('server running at %s:%s', host, port)
})