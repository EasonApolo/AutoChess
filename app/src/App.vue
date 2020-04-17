<template>
  <v-app>
    <pop></pop>

    <v-card class='mt-8 py-4 px-8 mx-auto' v-if="state == 0" width='25rem'>
      <v-text-field v-model='username' hide-details label='username' required></v-text-field>
      <v-text-field v-model='password' hide-details label='password' required></v-text-field>
      <div class='my-4'>
        <v-avatar class='mr-2' color="indigo" size="36" v-for='(u, id) in local.users' :key='id' @click='autoLogin(u)' style='cursor:pointer'>
          <span class="white--text">{{u.username}}</span>
        </v-avatar>
      </div>
      <v-btn block class='mb-4' @click='login' color='primary'>登录</v-btn>
      <v-btn block class='mb-4' @click='signup'>注册</v-btn>
    </v-card>

    <v-card class='mt-8 pa-4 mx-auto' width='50rem' v-else-if="state == 1">
      <div><span>{{user.name}}</span></div>
      <v-divider class="my-4"></v-divider>
      <div>
        <v-btn @click='createRoom' color='primary'>创建房间</v-btn>
      </div>
      <v-divider class="my-4"></v-divider>
      <v-list>
        <v-list-item-group color="primary">
          <v-list-item class='item' v-if='rooms.length == 0'>还没有房间，创建一个吧！</v-list-item>
          <v-list-item class='item' v-for="r in rooms" :key='r.id' :class='{disable:r.users.length>=2}' @click='joinRoom(r.id)'>
            <v-chip class='mr-2' v-for='u in r.users' :key='u.id'>{{u.name}}</v-chip>
            <span>{{r.users.length}}/4</span>
            <span v-if='r.stage==0'>准备中</span>
            <span v-else>比赛中</span>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-card>

    <v-card class='mt-8 pa-4 mx-auto' width='50rem' v-else-if="state == 2">
      <div>
        <v-btn class='mr-4' color='primary' @click='startRoom' :disabled='room.users && room.users.length < 2'>开始</v-btn>
        <v-btn @click='exitRoom'>退出</v-btn>
      </div>
      <v-divider class="my-4"></v-divider>
      <v-list>
        <v-list-item-group color="primary">
          <v-list-item class='item' v-for="u in room.users" :key='u.id'>
            {{u.name}}
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-card>

    <div v-else-if='state == 3' class='game' style='position:relative'>
      <v-card class='mx-auto' style='position:absolute;bottom:15.5rem;left:0;right:0' width='750px' height='550px' ref='container'>
        <canvas ref='canvas' style='width:100%;height:100%' :width='w' :height='h' @click='clickBoard'></canvas>
      </v-card>

      <!-- store -->
      <v-card class='d-flex mx-auto pa-2 ' width='39.5rem' style='position:absolute;bottom:.5rem;left:0;right:0'>
        <div class=''>
          <v-btn small class='d-block mb-1' width='6rem' color='secondary' @click='deal'>deal</v-btn>
          <v-btn small class='d-block' width='6rem'>level{{game.lvl}}</v-btn>
          <div class='mt-1'>
            <v-chip class='mr-1' color='yellow darken-4' text-color='white' small>{{this.game.gold}}</v-chip>
            <v-chip color='red darken-4' text-color='white' small>{{this.game.exp}}</v-chip>
          </div>
        </div>
        <v-card class='ml-2' width='6rem' v-for='(c, index) in store.cards' :key='index' @click='buyCard(index)'>
          <img v-if='c.src' class='d-block' width='100%' :src='c.src'>
          <v-sheet v-else width='100%' height='6rem'></v-sheet>
        </v-card>
      </v-card>

      <!-- hand -->
      <v-card class='d-flex mx-auto pa-2 pl-0 justify-space-around' width='59rem' style='position:absolute;bottom:8rem;left:0;right:0'>
        <v-card class='ml-2' width='6rem' v-for='(c, index) in hand.cards' :key='index' @click='clickHand(c, index)'>
          <img v-if='c.src' class='d-block' width='100%' :src='c.src'>
          <v-sheet v-else width='100%' height='6rem'></v-sheet>
          <div v-if='c.equips' class='d-flex' style='position:absolute;bottom:0;left:0'>
            <img class='d-block' width='24rem' v-for="(e, idx) in c.equips" :key='idx' :src='e.src'>
          </div>
        </v-card>
      </v-card>

      <!-- equip -->
      <v-card class='d-flex pa-2 pb-0 mx-auto flex-column justify-space-around' style='position:absolute;bottom:15.5rem;left:4rem;width:9rem;'>
        <v-card class='mb-2' width='3rem' v-for='(e, index) in equips' :key='index' @click='clickEquip(e, index)'>
          <img v-if='e.src' class='d-block' width='100%' :src='e.src'>
          <v-sheet v-else width='100%' height='3rem'></v-sheet>
        </v-card>
      </v-card>

      <!-- hold -->
      <v-card class='' style='position:absolute;pointer-events:none' width='6rem' :style='{left:holdX,top:holdY,width:holdWidth}'>
        <img v-if='hold' class='d-block' width='100%' :src='hold.src'>
      </v-card>

      <v-card class='show' v-if='showChess!==undefined' :style='{left:showPos[0],top:showPos[1]}'>
        {{showChess.name}}
        <div class='attr'>
          <div>hp:</div><div>{{(showChess.hp_||0).toFixed(0)}}/{{showChess.hp.toFixed(0)}}</div>
          <div>mp:</div><div><span v-if='showChess.mp'>{{(showChess.mp_||0).toFixed(0)}}/{{showChess.mp.toFixed(0)}}</span></div>
          <div>ad:</div><div>{{showChess.ad.toFixed(0)}}</div>
          <div>as:</div><div>{{showChess.as.toFixed(2)}}</div>
          <div>range:</div><div>{{showChess.range.toFixed(0)}}</div>
          <div>armor:</div><div>{{showChess.armor.toFixed(0)}}</div>
          <div>mr:</div><div>{{showChess.mr.toFixed(0)}}</div>
        </div>
        <div class='buff'>
          <div v-for='(buff, index) in showChess.buff' :key='index'>
            {{buff.name}}
          </div>
        </div>
      </v-card>

      <div v-for='src in allsrc' :key='src' style='display:none'>
        <img :src='src'>
      </div>
    </div>
  </v-app>
</template>

<script>
import bus from './bus'
import Pop from './Pop'
import CardInfo from './assets/card'
import ClassInfo from './assets/class'
import PosInfo from './assets/position'
import ChessInfo, { chess, buff_regainMana } from './assets/chess'
import ColorInfo from './assets/color'
import { setTimeout } from 'timers'
import { util_tgt, util_attack} from './assets/util'
import { randInt, removeFromArr, numberize, findArr } from './assets/helper'
import EquipInfo, { equip, merge_map } from './assets/equip'
import { schedule, upgradeExp } from './assets/script'
import { DamageDisplay } from './assets/damageDisplay'

export default {
  name: 'app',
  data () {
    return {
      state: 0,
      username: '',
      password: '',
      local: {
        users: {},
      },
      user: {},
      room: {},
      rooms: [],
      ws: {
        ip: `ws://192.168.1.2:81/`,
        rooms: undefined,
        room: undefined,
        card: undefined,
        chess: undefined,
      },
      fetchID: undefined,
      canvas: undefined,
      ctx: undefined,
      w: 0,
      h: 0,
      xbase: 0,
      ybase: 0,
      mouse: {x:undefined, y:undefined},  // this coordinate is doubled
      game: {
        turn: 0,
        gold: 10,
        exp: 0,
        lvl: 1,
        costUpgrade: 4,
        costRedeal: 2,
        damageRecord: [],
        damageDisplays: [],
        grave: [],
        classes: {},
        schedule: {},
        hp: 100,
        enemy: undefined,
        combo: 0,
      },
      hold: undefined,
      board: {
        grid: undefined,
      },
      store: {
        cards: new Array(5).fill(new Object())
      },
      hand: {
        cards: new Array(9).fill(new Object())
      },
      equips: new Array(9).fill(new Object()),
      allsrc: [],
      queue: [],
      util: [],
      showChess: undefined,
      showPos: undefined,
      // ip: 'http://47.106.171.107:80/',
      ip: 'http://192.168.1.2:81/',
    }
  },
  components: {
    Pop
  },
  created () {
    addEventListener('mousemove', e => {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
    })
    this.initBoard()
  },
  mounted () {
    this.loadLocalUsers()
  },
  computed: {
    sortedRoomUsers () {
      let users = this.room.users
      return users.sort((a,b) => a.hp - b.hp)
    },
    holdX () {
      return `${ this.mouse.x - 3*16 }px`
    },
    holdY () {
      return `${ this.mouse.y - 3*16 }px`
    },
    holdWidth () {
      return this.hold instanceof equip ? '3rem' : '6rem'
    }
  },
  watch: {
    state (new_val, old_val) {
      if (new_val == 1) {
        if (this.ws.room) {
          this.ws.room.close()
          this.ws.room = undefined
        }
        this.fetchRooms()
      } else if (new_val == 2) {
        if (this.ws.rooms) {
          this.ws.rooms.close()
          this.ws.rooms = undefined
        }
        this.fetchRoom()
      } else if (new_val == 3) {
        this.ws.room.close()
        this.ws.room = undefined
      }
    },
    'room.stage': function (new_val, old_val) {
      // auto start game
      if (new_val == 1 && this.state != 3) {
        this.state = 3
        this.$nextTick(this.initializeGame)
      }
    },
    'game.gold': function (new_val, old_val) {
      this.ws.gold.send(new_val)
    },
    'game.exp': function (new_val, old_val) {
      this.syncExp('update')
    },
    'game.lvl': function (new_val, old_val) {
      this.syncExp('update')
    }
  },
  methods: {
    /*
      entry methods
      */
    getUserIndex (name) {
      return this.room.users.findIndex(v => v.name === name)
    },
    getEnemyIndex () {
      return this.getUserIndex(this.game.enemy.name)
    },
    getMeIndex () {
      return this.getUserIndex(this.username)
    },
    dealError (error) {
      bus.$emit('pop', error)
    },
    async fetch (route, param) {
      let formData = new FormData()
      for (let k in param) {
        formData.append(k, param[k])
      }
      return await fetch(`${this.ip}${route}`, {
        body: formData,
        method: 'POST',
      }).then(res => res.json())
      .then(json => {
        if (json.err) {
          this.dealError(json)
        }
        return json
      })
    },
    loadLocalUsers () {
      this.local.users = localStorage.users == undefined ? {} : JSON.parse(localStorage.users)
    },
    saveLocalUser (n, p) {
      let users = localStorage.users == undefined ? {} : JSON.parse(localStorage.users)
      // called after login, this.user is assigned
      users[this.user.id] = { username: n, password: p }
      localStorage.users = JSON.stringify(users)
    },
    validate () {
      if (this.username == '' || this.password == '') {
        this.dealError('empty username or password')
        return true
      }
    },
    autoLogin (user) {
      this.username = user.username
      this.password = user.password
      this.login()
    },
    login () {
      if (this.validate()) return
      let param = {name: this.username, password: this.password}
      this.fetch('user/login', param).then(data => {
        let user = data.user
        if (user) this.user = user
        this.saveLocalUser(this.username, this.password)
        if (this.user.room != undefined) {
          this.room.id = this.user.room
          this.state = 2
        } else {
          this.state = 1
        }
      })
    },
    signup () {
      if (this.validate()) return
      let param = {name: this.username, password: this.password}
      this.fetch('user/signup', param).then(json => {
        if (json.user) {
          this.dealError('register success! click login.')
        }
      })
    },
    fetchRooms () {
      this.ws.rooms = new WebSocket(`${ this.ws.ip }room/list`)
      this.ws.rooms.onopen = () => this.ws.rooms.send('immediate')
      this.ws.rooms.onmessage = e => {
        this.rooms = JSON.parse(e.data)
      }
    },
    fetchRoom () {
      this.ws.room = new WebSocket(`${ this.ws.ip }room?rid=${ this.room.id }`)
      this.ws.room.onopen = () => this.ws.room.send('immediate')
      this.ws.room.onmessage = e => {
        this.room = JSON.parse(e.data)
      }
    },
    joinRoom (rid) {
      let param = { rid: rid, uid: this.user.id }
      this.fetch('room/join', param).then(data => {
        this.state = 2
        this.room = data.room
      })
    },
    exitRoom () {
      let param = { uid: this.user.id }
      this.fetch('room/exit', param).then(json => {
        this.rooms = json.rooms
        this.state = 1
      })
    },
    createRoom () {
      let param = { uid: this.user.id }
      this.fetch('room/create', param).then(data => {
        this.state = 2
        this.room = data.room
      })
    },
    startRoom () {
      let param = { rid: this.room.id}
      this.fetch('room/start', param).then(data => {
        this.room = data.room
        this.state = 3
        this.$nextTick(this.initializeGame)
      })
    },
    /*
      game main thread
      */
    initializeGame () {
      // init board
      this.w = this.$refs.canvas.offsetWidth * 2
      this.h = this.$refs.canvas.offsetHeight * 2
      // init size data
      let info = PosInfo.board
      this.xbase = this.w/2-6.5*info.ratio*info.w1,
      this.ybase = info.h/2-3.75*info.w1
      // init ctx
      this.ctx = this.$refs.canvas.getContext('2d')
      // start main thread
      this.main()
      this.wsCard()
      this.wsGold()
      this.wsChess()
      this.wsExp()
      this.queue.push(this.actAll)
      this.equips[0] = new EquipInfo[0]()
      this.equips[1] = new EquipInfo[0]()
      this.equips[2] = new EquipInfo[1]()
      this.equips[3] = new EquipInfo[1]()
    },
    // Gold and Exp
    wsGold () {
      this.ws.gold = new WebSocket(`${ this.ws.ip }game/gold?rid=${ this.room.id }&uid=${ this.user.id }`)
      this.ws.gold.onopen = () => {
        this.ws.gold.send('init')
      }
      this.ws.gold.onmessage = e => { // in initialization, server returns init gold
        let syncGold = parseInt(e.data)
        if (!isNaN(syncGold)) {
          this.game.gold = syncGold
        }
      }
    },
    wsExp () {
      this.ws.exp = new WebSocket(`${ this.ws.ip }game/exp?rid=${ this.room.id }&uid=${ this.user.id }`)
      this.ws.exp.onopen = () => { this.syncExp('init') }
      this.ws.exp.onmessage = e => {
        let { exp, lvl } = JSON.parse(e.data)
        if (exp != undefined || lvl != undefined) {
          [this.game.exp, this.game.lvl] = [exp, lvl]
        }
      }
    },
    syncExp (type) {
      let data = { type: type, exp: this.game.exp, lvl: this.game.lvl }
      this.ws.exp.send(JSON.stringify(data))
    },
    // chess
    wsChess () {
      this.ws.chess = new WebSocket(`${ this.ws.ip }game/chess?rid=${ this.room.id }&uid=${ this.user.id }`)
      this.ws.chess.onopen = () => { this.syncChess('init') }
      this.ws.chess.onmessage = e => {
        let { hand, board } = JSON.parse(e.data)
        hand.map((c, idx) => {
          if (c != null) {
            this.hand.cards.splice(idx, 1, this.createChess(c.id, 0, c.lvl))
          }
        })
        board.map((row, y) => row.map((g, x) => {
          if (g != null) {
            let newChess = this.createChess(g.id, 0, g.lvl)
            this.setChess(y, x, newChess)
          }
        }))
      }
    },
    syncChess (type) {
      let data
      if (type == 'init') {
        data = { type: type }
      } else {
        let board = this.board.grid.map(
          row => row.map(
            g => g != undefined ? { id: g.id, lvl: g.lvl } : null
          )
        )
        let hand = this.hand.cards.map(
          c => c.id ? { id: c.id, lvl: c.lvl } : null
        )
        data = { type: type, board: board, hand: hand }
      }
      this.ws.chess.send(JSON.stringify(data))
    },
    // Store functions
    wsCard () {
      this.ws.card = new WebSocket(`${ this.ws.ip }game/card?rid=${ this.room.id }&uid=${ this.user.id }`)
      this.ws.card.onopen = () => {
        this.syncStore('init')
      }
      this.ws.card.onmessage = e => {
        let card_ids = JSON.parse(e.data)
        this.store.cards = card_ids.map(id => {
          return id == null ? {} : CardInfo[id]
        })
      }
    },
    syncStore (type) {
      let current = this.store.cards
        .map(c => ({ id: c.id, lvl: c.cost-1 }))   // cost from 1, card lvl from 0, do transformation
      let data = { type: type, cards: current}
      this.ws.card.send(JSON.stringify(data))
    },
    deal () {
      if (this.game.gold < 2) {
        this.dealError('More Gold is Required')
        return
      }
      this.game.gold -= 2
      this.syncStore('deal')
    },
    buyCard(index) {
      let wannaBuy = this.store.cards[index]
      if (this.game.gold < wannaBuy.cost) {
        this.dealError('More Gold is Required')
        return
      }
      // click empty card
      if (this.store.cards[index].id == undefined) return
      // if able to buy
      if (this.addChess(wannaBuy.id)) {
        this.store.cards[index] = {}
        this.game.gold -= wannaBuy.cost
        this.syncStore('buy')
      }
    },
    // click events
    clickEquip (e, index) {
      if (this.hold instanceof chess) return
      if (this.hold instanceof equip ) {
        this.hold.hold = undefined
        if (this.equips[index].id == undefined) {
          this.equips[index] = this.hold
          this.hold = undefined
        } else {
          let tmp = this.hold
          this.hold = this.equips[index]
          this.hold.hold = { type: 'equip', id: index }
          this.equips[index] = tmp
        }
      } else {
        this.hold = this.equips[index]
        this.hold.hold = { type: 'equip', id: index }
        this.equips[index] = {}
      }
    },
    clickBoard (e) {
      let cx = e.offsetX * 2, cy = e.offsetY * 2
      let pos = this.getPosByCoord (cx, cy)
      if (pos == undefined) return
      else {
        let [y, x] = pos
        let grids = this.board.grid
        if (grids[y][x] == undefined && this.hold instanceof chess) {
          this.hold.hold = undefined
          grids[y][x] = this.hold
          this.hold = undefined
        } else if (grids[y][x] instanceof chess) {
          if (this.hold == undefined) {
            this.hold = grids[y][x]
            this.hold.hold = { type: 'board', pos: [y, x] }
            grids[y][x] = undefined
          } else if (this.hold instanceof chess) {
            let tmp = this.hold
            this.hold.hold = undefined
            this.hold = grids[y][x]
            this.hold.hold = { type: 'board', pos: [y, x] }
            grids[y][x] = tmp
          } else if (this.hold instanceof equip) {
            this.hold.hold = undefined
            this.equiping(grids[y][x])
          }
        }
      }
    },
    clickHand (c, index) {
      if (c.id == undefined) {
        if (this.hold == undefined) return
        else if (this.hold instanceof chess) {
          this.hold.hold = undefined
          this.hand.cards[index] = this.hold
          this.hold = undefined
        }
      }
      else if (c instanceof chess) {
        if (this.hold == undefined) {
          c.hold = { type: 'hand', id: index }
          this.hold = c
          this.hand.cards[index] = {}
        }
        else if (this.hold instanceof chess) {
          this.hold.hold = undefined
          this.hand.cards[index].hold = { type: 'hand', id: index }
          this.hand.cards[index] = this.hold
          this.hold = c
        } else if (this.hold instanceof equip) {
          this.hold.hold = undefined
          this.equiping(c)
        }
      }
      // swap
    },
    setGrid (i, j, chess) {
      if (chess !== undefined) {  // if undefined is set to this grid
        chess.pos = [i, j]
      }
      this.board.grid[i][j] = chess
    },
    setChess (r, c, chess=undefined) {
      let grid = this.board.grid
      // camp=0 friend, camp=1 opponent
      if (chess === undefined) {  // swap hold and grid[i][j]
        if (r <= 2) return        // cannot set at j<=2
        if (this.hold && !grid[r][c]) { // the only way chesses on board may increase
          let num = 0
          for (let i in grid) {
            for (let j in grid[i]) {
              if (grid[i][j] && grid[i][j].camp==0) {
                num++
              }
            }
          }
          if (num >= this.game.lvl) return
        }
        let tmp = this.hold
        this.hold = grid[r][c]
        this.setGrid(r, c, tmp)
      } else {  // system auto set
        this.setGrid(r, c, chess)
      }
    },
    addChess (cardId) {
      let cards = this.hand.cards
      let grids = this.board.grid
      // enough to upgrade ?
      let count = [[], [], []]
      let flag_upgrade = false
      for (let r in grids) {
        for (let c in grids[r]) {
          if (grids[r][c] && grids[r][c].id === cardId) {
            count[grids[r][c].lvl].push([r,c])
          }
        }
      }
      for (let i in cards) {
        if (cards[i] && cards[i].id === cardId) {
          count[cards[i].lvl].push(i)
        }
      }
      // upgrade
      for (let i = 0; i < 2; i++) {
        if ((i === 0 && count[i].length === 2) || (i === 1 && count[i].length === 3)) {
          flag_upgrade = true
          for (let j in count[i]) {
            let pos = count[i][j]
            let chess = j == 0 ? this.createChess(cardId, 0, i+1) : undefined
            if (pos.length === 2) {
              this.setChess(pos[0], pos[1], chess)
            } else {
              cards[pos] = chess
            }
          }
          count[i+1].push(count[i][0])
        }
      }
      if (flag_upgrade) return true
      // hand free
      else {
        for (let i in cards) {
          if (cards[i].id == undefined) {
            cards[i] = this.createChess(cardId, 0, 0)
            this.syncChess('update')
            if (this.allsrc.indexOf(cards[i].src) < 0) {
              this.allsrc.push(cards[i].src)// create img element enable ctx.drawImage()
            }
            return true
          }
        }
      }
      // no where to put new chess
      return false
    },
    createChess (id, camp, lvl) {
      let obj = new ChessInfo[id](this, lvl)
      obj.hold = false         // init hold
      obj.pos = undefined
      obj._dodge = 0
      obj.status = {}
      obj.camp = camp
      obj.equips = []
      return obj
    },
    getMergedEquip (id1, id2) {
      return merge_map[id1][id2] ?? merge_map[id2][id1]
    },
    equiping (chess) {
      if (chess && this.hold instanceof equip) {
        // merge
        if (this.hold.lvl == 0 && chess.equips?.length > 0) {
          for (let i in chess.equips) {
            let e = chess.equips[i]
            if (e.lvl == 0) {
              let mergedId = this.getMergedEquip(e.id, this.hold.id)
              chess.unequip(i)
              chess.equip(new EquipInfo[mergedId]())
              this.hold = undefined
              return
            }
          }
        }
        // else
        this.hold.hold = undefined
        chess.equip(this.hold)
        this.hold = undefined
      }
    },
    main () {
      this.clearAll()
      this.drawBoard()
      // this.drawHand()
      // this.drawStore()
      // this.drawHold()
      this.drawUtil()
      // this.drawDamageRecord()
      // this.drawclasses()
      // this.drawEquips()
      // this.drawSchedule()
      // this.drawPlayers()
      this.drawDamageDisplay()
      for (let i in this.queue) {
        this.queue[i]()
      }
      this.schedule()
      window.requestAnimationFrame(this.main)
    },
    schedule () {
      let s = this.game.schedule
      let grids = this.board.grid
      let OK = false // flag for transimission done
      // preparing stage
      if (s.status === 'prepare') {
        if (s.p === 0) {
          // this.fetchGameStatus()
        }
        else if (s.p < s.pn) {
        }
        else if (s.p === s.pn) {
          // collect data and upload to server
          this.game.clickBoard = false
          let data = {grids:[], hand: [], equip: []}
          for (let r in grids) {
            for (let c in grids[r]) {
              if (grids[r][c]) {
                let d = {pos:[r,c], id:grids[r][c].id, lvl: grids[r][c].lvl}
                if (grids[r][c].equips) {
                  d.equip = []
                  for (let i in grids[r][c].equips) {
                    d.equip.push(grids[r][c].equips[i].id)
                  }
                }
                data.grids.push(d)
              }
            }
          }
          for (let i in this.hand.cards) {
            if (this.hand[i] !== undefined) {
              data.hand.push(this.hand[i].id)
            }
          }
          for (let i in this.equips) {
            if (this.equips[i] !== undefined) {
              data.equip.push(this.equips[i].id)
            }
          }
          let param = {roomid: this.room.id, name: this.username, data: JSON.stringify(data)}
          // this.fetch('data/start', param).then(json => {
          //   this.setChessByData(JSON.parse(json.data), 1)
          //   this.game.enemy = json
          //   this.game.damageRecord = []
          //   this.game.schedule = {status: 'battle', p: 0, pn: 100000}
          //   this.startRound()
          // })
        }
        else if (s.p > s.pn) {
        }
        s.p ++
      } else if (s.status === 'battle') {
        if (s.p == s.pn) {
          let param = {roomid: this.room.id, name: this.username, hp: this.game.hp}
          this.fetch('data/end', param).then(json => {
            this.initBoard()
            this.setChessByData(JSON.parse(json.data), 0)
            this.game.schedule = {status: 'prepare', p: 0, pn: schedule.prepare.time}
            this.game.clickBoard = true
          })
        } else if (s.p > 1) {
        }
        s.p++
      } else {
        this.game.schedule = {status: 'prepare', p: 0, pn: schedule.prepare.time}
      }
    },
    /*
      init functions
      */
    initBoard () {
      let tmp = new Array(6).fill(undefined)
      this.board.grid = tmp.map(v => new Array(7).fill(undefined))
    },
    /*
      user actions
      */
    mousemove (e) {
      if (this.hold) {
        this.showChess = undefined
        this.showPos = undefined
        return
      }
      let x = e.clientX*2
      let y = e.clientY*2
      let pos = this.getPosByCoord(x, y)
      if (pos) {
        let [j, i] = pos
        if (this.board.grid[j][i]) {
          this.showChess = this.board.grid[j][i]
          this.showPos = [x/2+5+'px', y/2+5+'px']
          return
        }
      }
      this.showChess = undefined
      this.showPos = undefined
    },
    click (e) {
      let x = e.clientX*2
      let y = e.clientY*2
      // click board
      let pos = this.getPosByCoord(x, y)
      if (this.game.clickBoard && pos) {
        let [j, i] = pos
        // if hold a equipment, equit it to the chess
        if (this.hold instanceof equip) {
          if (this.board.grid[j][i]) {
            this.equiping(this.board.grid[j][i])
          }
        } else {
          this.setChess(j, i)
        }
      }
      // click hand
      let info = PosInfo.hand
      if (x>this.w/2-info.w/2 && x<this.w/2+info.w/2 && y>info.marTop && y<info.marTop+info.h) {
        if ((x-(this.w/2-info.w/2)) % (info.sp+info.w1) < info.sp || (y-info.marTop) % (info.w1+info.sp) < info.sp) return // blank space
        let index = Math.floor((x-(this.w/2-info.w/2))/(info.sp+info.w1))
        if (this.hold instanceof equip) {
          if (this.hand.cards[index]) {
            this.equiping(this.hand.cards[index])
          }
        }
        else {
          let cards = this.hand.cards
          let tmp = this.hold
          this.hold = cards[index]
          cards[index] = tmp
        }
      }
      // click store
      info = PosInfo.store
      if (x>this.w/2-info.w/2 && x<this.w/2+info.w/2 && y>this.h-info.h && y<this.h) {
        if (this.hold instanceof chess) {
          this.sellHoldChess()
          return
        }
        let left = x-(this.w/2-info.w/2)
        let top = y-(this.h-info.h)
        if (left%(info.w1+info.sp)<info.sp || top%(info.w1+info.sp)<info.sp) return
        else if (left < info.w1+info.sp) {
          if (top%(info.bh+info.sp)<info.sp) return
          else if (Math.floor(top/(info.bh+info.sp)) == 1) {
            this.buyDeal()
          } else if (Math.floor(top/(info.bh+info.sp)) == 2) {
            this.buyUpgrade()
          }
        }
        else {
          let buy = Math.floor(left / (info.w1+info.sp)) - 1
          this.buyCard(buy)
        }
      }
      //click equip
      info = PosInfo.equips
      if (x>info.l && x<info.l+info.h && y>info.t && y<info.t+info.h*this.equips.length) {
        let index = Math.floor((y-info.t)/info.h)
        if (!this.hold || this.hold instanceof equip) {
          let tmp = this.hold
          this.hold = this.equips[index]
          this.equips[index] = tmp
        }
      }
    },
    /*
      store related functions
      */
    sellHoldChess () {
      let lvl = this.hold.lvl
      let cost = CardInfo[this.hold.id].cost
      let price
      switch (lvl) {
        case 0: price = cost;break;
        case 1: price = cost+2;break;
        case 2: price = cost+4;break;
      }
      if (!price) console.log('price is undefined')
      // put chess.equips into this.equips, redundant are discarded
      if (this.hold.equips.length > 0) {
        for (let i in this.equips) {
          if (!this.equips[i]) {
            this.equips[i] = this.hold.equips.splice(0, 1)
            if (this.hold.equips.length === 0) break
          }
        }
      }
      this.game.gold += price
      this.hold = undefined
    },
    addExp (exp) {
      if (this.game.lvl >= 9) return false
      let require = upgradeExp[this.game.lvl-1]
      this.game.exp = this.game.exp + this.game.costUpgrade
      if (this.game.exp >= require) {
        this.game.exp = this.game.lvl == 8 ? 0 : this.game.exp - require
        this.game.lvl ++
      }
      return true
    },
    buyDeal () {
      if (this.game.gold >= this.game.costRedeal) {
        this.game.gold -= this.game.costRedeal
        this.deal()
      }
    },
    buyUpgrade () {
      if (this.game.gold >= this.game.costUpgrade) {
        if (this.addExp(this.game.costUpgrade)) {
          this.game.gold -= this.game.costUpgrade
        }
      }
    },
    updateGold () {
      let base = 5
      if (this.room.stage < 2) base = 2
      else if (this.room.stage < 4) base = parseInt(this.room.stage)
      let interest = Math.min(Math.floor(this.game.gold / 10), 5)
      let combo = Math.min(Math.floor(this.game.combo / 2), 3)
      this.game.gold += (base + interest + combo)
    },
    updateExp () {
      if (this.room.stage > 0) {
        this.addExp(2)
      }
    },
    /*
      game procedure
      */
    startRound () {
      this.queue.push(this.checkRemain)
      this.initAllChess()
    },
    actAll () {
      let grid = this.board.grid
      for (let i in grid) {
        for (let j in grid[i]) {
          if (grid[i][j] !== undefined) {
            let chess = grid[i][j]
            if (chess.status.stun) {
              let stun = chess.status.stun
              if (stun.p<stun.pn) {
                stun.p++
              } else {
                chess.status.stun = undefined
              }
            }
            else if (chess.status.ready) {
              // res[0] nearest coordinate [r,c], undefined if no nearest
              // res[1] nearest distance, 100 if no nearest
              let res = this.findNearestOppo(chess, i, j)
              let nearestPos = res[0]
              let nearestDis = res[1]
              if (nearestPos !== undefined) {
                if (nearestDis <= chess.range) {
                  chess.status.ready=undefined
                  chess.status.attack=0
                  chess.status.target=grid[nearestPos[0]][nearestPos[1]]
                } else {
                  // if target out of range, chess moves toward it for one step, then check best target again. So, no need to fix any target.
                  if (this.moveChess(chess, nearestPos)) {
                    chess.status.ready=undefined
                    chess.status.move = 0
                  }
                }
              }
            }
            else if (chess.status.attack >= 0)  {
              // if target been destroyed (set to undefined)
              if (chess.status.target !== undefined && chess.status.target.status.dead) {
                chess.status.ready = true
                chess.status.attack = undefined
                chess.status.target = undefined
              } else if (this.getDistance(...chess.pos, ...chess.status.target.pos) > chess.range) {
                if (this.moveChess(chess, chess.status.target.pos)) {
                  chess.status.move = 0
                }  // same, moveOnce, and find other best target
                chess.status.attack = undefined
                chess.status.target = undefined
              } else {
                let attackTime = 1/chess.as*1000
                chess.status.attack += 16
                if (chess.status.attack >= attackTime) {
                  chess.status.attack = 0
                  this.dealBuff('atk', chess)
                  this.createUtilAttack(chess, chess.status.target)
                  if (chess.mp && chess.mp_ >= chess.mp) {  // 攻击完成后才会施法
                    this.castSpell(chess)
                  }
                }
              }
            }
            else if (chess.status.move >= 0) {
              chess.status.move ++
              if (chess.status.move >= chess.sp) {
                chess.status.move = undefined
                chess.status.ready = true
              }
            }
            else if (chess.status.jump) {
              let jump = chess.status.jump
              if (jump.p === 0) {
                if (grid[jump.tgt[0]][jump.tgt[1]] === undefined) {
                  grid[chess.pos[0]][chess.pos[1]] = undefined
                  grid[jump.tgt[0]][jump.tgt[1]] = chess
                  chess.pos = jump.tgt
                }
                jump.p ++
              }
              else if (jump.p >= jump.pn) {
                chess.status.jump = undefined
                if (chess.status.target) {
                  chess.status.attack = 0
                }
              }
              else {
                jump.p ++
              }
            }
            else if (chess.status.spell >= 0) {
              if (chess.status.spell == chess.spell_pre){
                chess.spell()
              }
              if (chess.spell_post && chess.status.spell == chess.spell_post) {
                chess.status.spell = undefined
                chess.status.attack = 0
              }
              chess.status.spell ++
            }
          }
        }
      }
      let util = this.util
      for (let i in util) {
        if (util[i].status.prepare || util[i].status.done) {
          util[i].act()
        } else if (util[i].status.ready) {
          util[i].effect()
        }
      }
    },
    moveChessOnce (chess, tgt) {
      let src = chess.pos
      let grids = this.board.grid
      grids[src[0]][src[1]] = undefined
      grids[tgt[0]][tgt[1]] = chess
      chess.pos = tgt
    },
    // if chess cannot move, return false
    moveChess (chess, finalTarget) {
      let path = this.getPath(chess, finalTarget)
      if (path === undefined) {
        return false
      }
      let tgt = path[0]
      let grid = this.board.grid
      if (grid[tgt[0]][tgt[1]] === undefined) {// for ensurance, tgt should be undefined as it's selected by path-finding func.
        chess.orient = this.getOrient(...chess.pos, ...tgt)
        grid[chess.pos[0]][chess.pos[1]] = undefined
        grid[tgt[0]][tgt[1]] = chess
        chess.pos = tgt
        chess.status.move = true
      }
      return true
    },
    // transition into pre_spell stage
    castSpell (chess) {
      if (chess.spell) {
        chess.status.attack = undefined
        chess.status.spell = 0
        chess.mp_ = 0
      }
    },
    heal (util, tgt) {
      tgt.hp_ += util.val
      if (tgt.hp_ > tgt.hp) tgt.hp_ = tgt.hp
    },
    damage (util, tgt=undefined) {
      if (!tgt) tgt = util.tgt
      let damage = util.damage
      // buffed damage type
      let buff_type = this.dealBuff('util_type', util.src)
      if (buff_type) util.type = buff_type
      // armor, mr, dodge
      if (util.type === 0) {
        if (this.dealBuff('dodge', tgt)) {
          this.game.damageDisplays.push(new DamageDisplay(this, util.type, tgt.pos, 'miss'))
          return
        }
        damage = this.mitigate(tgt.armor) * damage
      } else if (util.type === 1) {
        damage = this.mitigate(tgt.mr) * damage
      }
      // other damage reduction
      damage = this.dealBuff('r_dmg', tgt, damage, util)
      // damage value confirmed, add to display & record
      this.game.damageDisplays.push(new DamageDisplay(this, util.type, tgt.pos, damage))
      this.addDamageToRecord(util, damage)
      // damage on shield
      damage = this.dealBuff('s_dmg', tgt, damage, util)
      // damage on hp
      tgt.hp_ -= damage
      // after hurt damage
      this.dealBuff('dmg', tgt, util.damage, util)  // use pre-mitigated damage
      // check vital status
      if (tgt.hp_ <= 0) {
        tgt.die()
      }
    },
    stun (util, tgt=undefined) {
      if (!tgt) {
        tgt = util.target
      }
      // if still no tgt (tgt already dead or something)
      if (!tgt) return
      // stunning shouldn't stop jump
      tgt.status.stun = {type:util.stun_type,p:0,pn:util.stun}
    },
    addDamageToRecord (util, damage) {
      let record = this.game.damageRecord
      if (util.src.camp === 0) {
        let intDamage = Math.round(damage)
        let pair = record.find(x => {return x.id === util.src.id})
        if (pair) {
          pair.val += intDamage
        } else {
          record.push({id: util.src.id, val: intDamage})
        }
        record.sort((a,b) => {a.val < b.val})
      }
    },
    mitigate (n) {
      return 100 / (n + 100)
    },
    dealBuff (type, chess, ...args) {
      if (type === 'dmg') {
        for (let i in chess.buff) {
          chess.buff[i].response(type, ...args)
        }
      } else if (type === 'atk') {
        for (let i in chess.buff) {
          chess.buff[i].response(type)
        }
      } else if (type === 's_dmg' || type === 'r_dmg') {
        let [damage, util] = args
        for (let i in chess.buff) {
          let res = chess.buff[i].response(type, damage, util)
          if (res!==undefined) damage = res
        }
        return damage
      } else if (type === 'util_type') {
        for (let i in chess.buff) {
          let dmg_type = chess.buff[i].response(type)
          if (dmg_type !== undefined) return dmg_type
        }
      } else if (type === 'dodge') {
        if (chess.dodge == 0) {
          return false
        }
        if (randInt(100) < chess.dodge * 100) {
          return true
        } else {
          return false
        }
      }
    },
    checkRemain () {
      let grid = this.board.grid
      let camp0 = 0
      let camp1 = 0
      for (let i in grid) {
        for (let j in grid[i]) {
          if (grid[i][j] === undefined) continue
          else if (grid[i][j].camp === 0) camp0++
          else if (grid[i][j].camp === 1) camp1++
        }
      }
      if (camp0 > 0 && camp1 > 0) return
      removeFromArr(this.queue, this.checkRemain)
      let damage = 0
      // lose
      if (camp0 === 0) {
        damage = camp1 * 2
        if (this.game.hp - damage < 0) {
          this.hp = 0
        } else {
          this.game.hp -= damage
        }
        this.game.combo = this.game.combo >= 0 ? -1 : this.game.combo - 1
      }
      else if (camp1 === 0) {
        this.game.combo = this.game.combo <= 0 ? 1 : this.game.combo + 1
      }
      if (this.game.schedule.status === 'battle') {
        this.game.schedule.p = this.game.schedule.pn
      }
    },
    // initialize all chesses at this round start
    initAllChess () {
      let grid = this.board.grid
      for (let i in grid) {
        for (let j in grid[i]) {
          let g = grid[i][j]
          if (g !== undefined) {
            g.status.ready = true
            g.orient = 0
            g.hp_ = g.hp
            if (g.mp) {
              g.mp_ = g.mp_init ? g.mp_init : 0
              g.buff.push(new buff_regainMana(this, g))
            }
          }
        }
      }
      this.game.classes = this.updateClasses(0)
      this.game.oppoClasses = this.updateClasses(1)
      this.initClassBuffs(0)
      this.initClassBuffs(1)
    },
    updateClasses (camp) {
      let grids = this.board.grid
      let classes = {}
      let info = ClassInfo
      let chessNames = []
      for (let r in grids) {
        for (let c in grids) {
          if (grids[r][c] !== undefined && grids[r][c].camp === camp && chessNames.indexOf(grids[r][c].name) < 0) {
            chessNames.push(grids[r][c].name)
            grids[r][c].cat.map(v => {
              if (v in classes) {classes[v].n++}
              else {classes[v] = {n:1}}
            })
          }
        }
      }
      for (let c in classes) {
        for (let s in info[c].stage) {
          if (info[c].exact && info[c].stage[s] === classes[c].n) {
            classes[c].active = s
          } else if (!info[c].exact) {
            if (info[c].stage[s] <= classes[c].n) {
              classes[c].active = s
            } else {
              break
            }
          }
        }
      }
      return classes
    },
    initClassBuffs (camp) {
      let classes = camp === 0 ? this.game.classes : this.game.oppoClasses
      for (let c in classes) {
        if (classes[c].active) {
          if (ClassInfo[c].buff) {  // note: all class has buff, this check is for development safety
            ClassInfo[c].buff(this, camp, classes[c].active)
          }
        }
      }
    },
    setChessByData (data, camp) {   // camp 0 friend, camp 1 enemy
      let grids = data.grids
      for (let i in grids) {
        let chess = grids[i]
        let r,c
        if (camp === 1) {
          r = 5-chess.pos[0]
          c = 6-chess.pos[1]
        } else {
          r = chess.pos[0]
          c = chess.pos[1]
        }
        this.setChess(r, c, this.createChess(chess.id, camp, chess.lvl))
        if (chess.equip) {
          for (let j in chess.equip) {
            this.board.grid[r][c].equip(new EquipInfo[chess.equip[j]]())
          }
        }
      }
    },
    /*
      game inline functions
      */
    getFurthestGrid (r, c) {
      let orient = this.getBackOrient(r, c)
      let order = [0, -1, 1, -2, 2, -3]
      for (let i=0; i<6; i++) {
        let testOrient = (orient+6+order[i]) % 6
        let tgt = this.getOrientGrid([r,c], testOrient)
        if (tgt && this.board.grid[tgt[0]][tgt[1]] === undefined) return [tgt, (orient+3)%6]
      }
    },
    getPosByCoord (x, y) {
      let info = PosInfo.board
      if (x>this.w/2-info.w/2 && x<this.w/2+info.w/2 && y>0 && y<info.h) {
        // x,y relative position to board centre
        let rx = x-this.w/2
        let ry = y-(info.h/2)
        let w = info.w1
        let k = Math.tan(Math.PI/6)
        let ratio = info.ratio
        // a,b,c are 3d index
        let a = Math.floor((ry+k*rx)/w)+8
        let b = Math.floor((ry-k*rx+w/2)/w)+7
        let c = Math.floor((rx+ratio/2*w)/(ratio*w))+7
        // j row index, i col index
        let j = Math.floor((a+b-7+1)/3)
        let i = Math.floor((c-(j%2+0.5)+1)/2)
        // out of grids
        if (i < 0 || i > 6 || j < 0 || j > 5) return
        return [j, i]
      }
    },
    // orient start: top-left 0
    getOrient (r1,c1, r2,c2) {
      [r1, c1, r2, c2] = numberize([r1, c1, r2, c2])
      if (r1===r2) {
        return c1<c2?2:5
      } else {
        if (r1%2==1) {
          if (r2<r1) {
            return c1===c2?0:1
          } else {
            return c1===c2?4:3
          }
        } else {
          if (r2<r1) {
            return c1===c2?1:0
          } else {
            return c1===c2?3:4
          }
        }
      }
    },
    getApproxOrient(r1, c1, r2, c2) {
      [r1, c1, r2, c2] = numberize([r1, c1, r2, c2])
      if (r1===r2) {
        return c1<c2?2:5
      } else {
        if (r1%2==1) {
          if (r2<r1) {
            return c1<=c2?0:1
          } else {
            return c1>=c2?4:3
          }
        } else {
          if (r2<r1) {
            return c1>=c2?1:0
          } else {
            return c1<=c2?3:4
          }
        }
      }
    },
    getOrientGrid (now, orient) {
      now = numberize(now)
      let pos = []
      let odd = now[0]%2
      if (orient < 2) {
        pos[0] = now[0] - 1
        pos[1] = odd?now[1]+orient:now[1]+orient-1
      } else if (orient == 3 || orient == 4) {
        pos[0] = now[0] + 1
        pos[1] = odd?now[1]+4-orient:now[1]+3-orient
      } else {
        pos = [now[0], orient === 2 ? now[1]+1:now[1]-1]
      }
      if (pos[0] < 0 || pos[0] > 5 || pos[1] < 0 || pos[1] > 6) return undefined
      return pos
    },
    samePos (a, b) {
      return a[0] === b[0] && a[1] === b[1]
    },
    getPathNode (now, tgt, open, close, displayflag) {
      if (displayflag) console.log(now)
      close.push(now)
      // get six adjacent, test if each is OK, add OK to ablePos and global open, compute OK distance
      let sixPos = this.getSixPos(now)
      let avails = []
      for (let i in sixPos) {
        let pos = sixPos[i]
        if (this.samePos(tgt, pos)) return [pos]
        if (this.board.grid[pos[0]][pos[1]] !== undefined) {
          continue
        }
        let flag = false
        for (let j in close) {
          if (this.samePos(close[j], pos)) {flag = true; break}
        }
        if (flag) continue
        avails.push({pos: pos, d:this.getDistance(...pos,...tgt)})
      }
      if (avails.length === 0) {
        return undefined
      }
      // sort and search begin with smallest d
      avails.sort((a,b)=>a.d-b.d)
      let paths = []
      let minD = -1                     // nextNode with same weight should all been tested
      for (let i in avails) {
        if (avails[i].d !== minD) {
          minD = avails[i].d
          if (paths.length > 0) {
            break
          }
        }
        let res = this.getPathNode(avails[i].pos, tgt, open, close.slice(), displayflag)
        if (res) {
          res.unshift(avails[i].pos)    // unshift only return new-length
          paths.push(res)               // save result path
        }
      }
      if (paths.length > 0) {
        let ret_path = this.getShortestPath(paths)
        return ret_path
      }
      else return undefined
    },
    getShortestPath (paths) {
      let minLen = 100
      let minInd = -1
      for (let j in paths) {
        if (paths[j].length < minLen) {
          minLen = paths[j].length
          minInd = j
        }
      }
      return paths[minInd]
    },
    getPath (chess, target) {
      let tgt = numberize(target)
      let open = []
      let close = []
      let flag = this.samePos(chess.pos, [-1,-1]) ? true : false
      return this.getPathNode(chess.pos, tgt, open, close, flag)
    },
    getSixPos(cen) {
      cen = numberize(cen)
      let dir = cen[0]%2===1 ? [[-1,0],[-1,1],[0,1],[1,1],[1,0],[0,-1]] : [[-1,-1],[-1,0],[0,1],[1,0],[1,-1],[0,-1]]
      let sixPos = []
      for (let i in dir) {
        let v = dir[i]
        let r = cen[0]+v[0]
        let c = cen[1]+v[1]
        if (r<0||r>5||c<0||c>6) continue
        sixPos.push([r,c])
      }
      return sixPos
    },
    getBackOrient (r, c) {
      [r, c] = numberize([r, c])
      let orient = undefined
      if (r <= 1) {
        if (c <= 3) orient = 0
        else orient = 1
      } else if (r >= 2 && r <= 3) {
        if (c <= 3) orient = 5
        else orient = 2
      } else if (r >= 4) {
        if (c <= 3) orient = 4
        else orient = 3
      }
      return orient
    },
    getBasedCoord(r, c) {
      let [x, y] = this.getCoord(r, c)
      x += this.xbase, y += this.ybase
      return [x, y]
    },
    getCoord (r, c) {
      [r, c] = numberize([r, c])
      let w1 = PosInfo.board.w1
      let x = PosInfo.board.ratio * w1 * 2 * c + (r%2) * w1
      let y = r*3/2*w1
      return [x, y]
    },
    getEuclid (x1, y1, x2, y2) {
      return Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2))
    },
    getDistance (a, b, c, d) {
      [a,b,c,d] = numberize([a,b,c,d])
      let colD = undefined
      let rowD = Math.abs(a-c)
      let k = Math.ceil(rowD/2)
      let u = undefined
      let l = undefined
      let dis = undefined
      if (a%2 === c%2) {
        u = b+k
        l = b-k
      } else if (a%2 === 1) {
        u = b+k
        l = b-k+1
      } else if (c%2 === 1) {
        u = b+k-1
        l = b-k
      }
      if (d<=u && d>=l) {
        colD = 0
      } else if (d>u) {
        colD = d-u
      } else if (d<l) {
        colD = l-d
      }
      dis = colD + rowD
      return dis
    },
    findNearestOppo (chess, r, c) {
      let grid = this.board.grid
      let minDis = 100
      let minSet = []
      let nearest = undefined
      for (let i in grid) {
        for (let j in grid[i]) {
          if (grid[i][j] !== undefined) {
            if (grid[i][j].camp !== chess.camp && !grid[i][j].untargetable) {
              let dis = this.getDistance(r,c, i,j)
              if (dis < minDis) {
                minDis = dis
                minSet = [[i,j]]
              } else if (dis == minDis) {
                minSet.push([i,j])
              }
            }
          }
        }
      }
      if (minSet.length > 1) {
        nearest = minSet[randInt(minSet.length)]
      } else {
        nearest = minSet[0]
      }
      if (nearest) {
        nearest = numberize(nearest)
      }
      return [nearest, minDis]
    },
    createUtilAttack (src, tgt) {
      let u = new util_attack(this, src, tgt)
    },
    /*
      draw functions
      */
    clearAll () {
      let ctx = this.ctx
      ctx.clearRect(0, 0, this.w, this.h)
    },
    drawUtil () {
      let util = this.util
      let ctx = this.ctx
      let info = PosInfo.board
      let xbase = this.w/2-6.5*info.ratio*info.w1
      let ybase = info.marTop+info.h/2-3.75*info.w1
      for (let i in util) {
        util[i].draw(ctx, xbase, ybase)
      }
    },
    drawBoard () {
      let ctx = this.ctx
      let info = PosInfo.board
      let grid = this.board.grid
      const bw = info.w
      const bh = info.h
      const w1 = info.w1
      const w2 = info.w2
      const ratio = info.ratio
      ctx.fillStyle = ColorInfo.board
      ctx.fillRect(this.w/2-bw/2, 0, bw, bh)
      for (let i in grid) {
        let bias = i % 2 == 1 ? ratio*w1/2 : -ratio*w1/2
        let cenT = bh/2+(i-2.5)*1.5*w1
        for (let j in this.board.grid[i]) {
          let cenL = this.w/2+(j-3)*ratio*2*w1+bias
          // grid
          ctx.beginPath()
          for (let k =0; k < 6; k++) {
            let rad = Math.PI*(1/3*k-1/6)
            let x = Math.cos(rad) * w1
            let y = Math.sin(rad) * w1
            this.ctx.lineTo(cenL+x, cenT+y)
          }
          ctx.closePath()
          ctx.strokeStyle = ColorInfo.obj
          ctx.stroke()
          let chess = grid[i][j]
          if (chess !== undefined) {
            let biasX=0, biasY=0
            // status:move position bias
            if (chess.status.move >= 0) {
              let rad = (5-chess.orient)*Math.PI/3
              let biasD = ratio*2*w1*(1-chess.status.move/chess.sp)
              biasX = biasD * Math.cos(rad)
              biasY = -biasD * Math.sin(rad)
            }
            // status:jump position bias
            if (chess.status.jump) {
              let jump = chess.status.jump
              let [x0, y0] = this.getCoord(...jump.src)
              let [x1, y1] = this.getCoord(...jump.tgt)
              biasX = -(x1-x0)*(1-jump.p/jump.pn)
              biasY = -(y1-y0)*(1-jump.p/jump.pn)
            }
            // img
            let img = new Image()
            img.src = chess.src
            let imgW = chess.size * w2
            ctx.drawImage(img, cenL-imgW/2+biasX, cenT-imgW/2+biasY, imgW, imgW)
            // hp
            ctx.fillStyle = chess.camp===0 ? ColorInfo.chessHp:ColorInfo.chessHpOppo
            ctx.fillRect(cenL-info.hpW/2+biasX, cenT-info.hpT+biasY, chess.hp_/chess.hp*info.hpW, info.hpH)
            // shield
            let shield = chess.getShield()
            if (shield) {
              ctx.fillStyle = ColorInfo.chessShield
              ctx.fillRect(cenL+info.hpW*(chess.hp_/chess.hp-1/2)+biasX, cenT-info.hpT+biasY, shield/chess.hp*info.hpW, info.hpH)
            }
            if (chess.mp) {
              ctx.fillStyle = ColorInfo.chessMp
              ctx.fillRect(cenL-info.hpW/2+biasX, cenT-info.mpT+biasY, chess.mp_/chess.mp*info.hpW, info.hpH)
            }
            if (chess.status.spell) {
              let rate = Math.min([chess.status.spell/chess.spell_pre, 1])
              if (chess.status.spell > chess.spell_pre && chess.spell_post) {
                rate = (chess.status.spell - chess.spell_pre) / (chess.spell_post - chess.spell_pre)
              }
              ctx.fillStyle = ColorInfo.chessSp
              ctx.fillRect(cenL-info.hpW/2+biasX, cenT-info.spT+biasY, rate*info.hpW, info.hpH)
            }
            if (chess.status.stun) {
              if (chess.status.stun.type===0) {
                let startAngle = Math.PI*2*(chess.status.stun.p%36)/36
                ctx.strokeStyle = '#666'
                ctx.lineWidth = 4
                ctx.beginPath()
                ctx.arc(cenL+biasX, cenT-50+biasY, 20, startAngle, Math.PI*5/3+startAngle)
                ctx.stroke()
                ctx.lineWidth = 1
              }
            }
            // buff
            for (let i in chess.buff) {
              if (chess.buff[i].draw) {
                chess.buff[i].draw(ctx, cenL+biasX, cenT+biasY)
              }
            }
            for (let i in chess.equips) {
              let img = new Image()
              img.src = chess.equips[i].src
              let imgR = info.w2/2*chess.size
              let equipR = info.wEquip * chess.size
              ctx.drawImage(img, cenL-imgR+biasX+equipR*i, cenT+imgR+biasY, equipR, equipR)
            }
          }
        }
      }
    },
    drawHand () {
      let ctx = this.ctx
      let info = PosInfo.hand
      const cw = info.w1
      const sp = info.sp
      const hw = info.w
      const hh = info.h
      const handT = info.marTop
      let handL = this.w/2-hw/2
      let cards = this.hand.cards
      ctx.fillStyle = ColorInfo.section
      ctx.fillRect(handL, handT, hw, hh)
      for (let i in cards) {
        ctx.strokeStyle = ColorInfo.obj
        let cardL = this.w / 2 + (i-4-0.5)*cw+(i-4)*sp
        let cardT = handT + sp
        ctx.strokeRect(cardL, cardT, cw, cw)
        if (cards[i]) {
          let img = new Image()
          img.src = cards[i].src
          ctx.drawImage(img, cardL, cardT, cw, cw)
          for (let j in cards[i].equips) {
            let img = new Image()
            img.src = cards[i].equips[j].src
            ctx.drawImage(img, cardL+info.wEquip*j, cardT+cw-info.wEquip, info.wEquip, info.wEquip)
          }
        }
      }
    },
    drawStore () {
      let ctx = this.ctx
      let info = PosInfo.store
      const bw = info.w
      const bh = info.h
      const cw = info.w1
      const sp = info.sp
      const bth = info.bh
      let strL = this.w/2-bw/2
      let strT = this.h-bh
      ctx.fillStyle = ColorInfo.section
      ctx.fillRect(strL, strT, bw, bh)
      let cards = this.store.cards
      for (let i in cards) {
        ctx.strokeStyle = ColorInfo.obj
        let cardL = strL + bw + (i - 5) * cw + (i - 5) * info.sp
        let cardT = strT + info.sp
        ctx.strokeRect(cardL, cardT, cw, cw)
        if (cards[i] === undefined) continue
        ctx.fillStyle = ColorInfo.cardText
        ctx.font = '28px YaHei'
        ctx.textAlign = 'start'
        ctx.fillText(cards[i].name, cardL+14, cardT+36)
        for (let j in cards[i].cat) {
          ctx.fillText(ClassInfo[cards[i].cat[j]].name, cardL+14, cardT+120+j*40)
        }
      }
      // first button
      ctx.textBaseline="top"
      ctx.fillStyle = ColorInfo.gold
      ctx.fillText(this.game.gold, strL+sp, strT+sp)
      // second redeal button
      ctx.textAlign = 'end'
      ctx.fillStyle = ColorInfo.reDealButton
      ctx.fillRect(strL+sp, strT+sp*2+bth, cw, bth)
      ctx.fillStyle = 'white'
      ctx.fillText(this.game.costRedeal, strL+sp+cw-50, strT+sp*2+bth+40)
      //third upgrade button
      ctx.fillStyle = ColorInfo.upgradeButton
      ctx.fillRect(strL+sp, strT+sp*3+bth*2, cw, bth)
      ctx.fillStyle = 'white'
      ctx.fillText('level'+this.game.lvl, strL+sp+cw-50, strT+sp*3+bth*2+10)
      ctx.fillText(this.game.costUpgrade, strL+sp+cw-50, strT+sp*3+bth*2+40)
    },
    drawHold () {
      if (this.hold !== undefined) {
        let ctx = this.ctx
        let img = new Image()
        img.src = this.hold.src
        let w = PosInfo.hand.w1
        let wEquip = PosInfo.hand.wEquip
        let l = this.mouse.x-w/2
        let t = this.mouse.y-w/2
        ctx.drawImage(img, l, t, w, w)
        if (this.hold instanceof chess) {
          for (let j in this.hold.equips) {
            let img = new Image()
            img.src = this.hold.equips[j].src
            ctx.drawImage(img, l+wEquip*j, t+w-wEquip, wEquip, wEquip)
          }
        }
      }
    },
    drawDamageRecord () {
      let ctx = this.ctx
      let info = PosInfo.record
      let record = this.game.damageRecord
      ctx.fillStyle = 'green'
      for (let i in record) {
        ctx.textAlign = 'right'
        ctx.fillText(ChessInfo[record[i].id].name, info.l, info.t+i*info.sph)
        ctx.textAlign = 'left'
        ctx.fillText(record[i].val, info.l+info.spw, info.t+i*info.sph)
      }
    },
    drawclasses () {
      let ctx = this.ctx
      let info = PosInfo.class
      let classes = this.game.classes
      let i = 0
      for (let c in classes) {
        ctx.fillStyle = '#333333'
        ctx.textAlign = 'right'
        ctx.fillText(ClassInfo[c].name, info.l, info.t+info.sph*i)
        ctx.textAlign = 'right'
        ctx.fillText(classes[c].n, info.l+info.spw, info.t+info.sph*i)
        ctx.textAlign = 'left'
        for (let s in ClassInfo[c].stage) {
          if (classes[c].active && classes[c].active=== s) {
              ctx.fillStyle = '#333333'
          } else {
            ctx.fillStyle = '#999999'
          }
          ctx.fillText(ClassInfo[c].stage[s], info.l+2*info.spw+25*(s), info.t+info.sph*i)
        }
        i++
      }
    },
    drawEquips () {
      let ctx = this.ctx
      let equips = this.equips
      let info = PosInfo.equips
      for (let i in equips) {
        ctx.strokeStyle = '#999999'
        ctx.strokeRect(info.l, info.t+info.h*i, info.h, info.h)
        if (equips[i]) {
          let img = new Image()
          img.src = equips[i].src
          ctx.drawImage(img, info.l, info.t+info.h*i, info.h, info.h)
        }
      }
    },
    drawSchedule () {
      let ctx = this.ctx
      let sch = this.game.schedule
      let info = PosInfo.schedule
      if (sch.status === 'prepare' || sch.status === 'battle' && sch.p >= sch.pn) {
        ctx.lineWidth = 5
        ctx.beginPath()
        if (sch.p <= sch.pn) {
          ctx.strokeStyle = '#555'
          ctx.arc(this.w/2, info.t, info.arcR, Math.PI/2-(1-sch.p/sch.pn)*Math.PI*2, Math.PI/2)
        } else {
          let opacity = (40-Math.abs(((sch.p-sch.pn)%80)-40))*0.02
          ctx.strokeStyle = `rgba(85, 85, 85, ${opacity})`
          ctx.arc(this.w/2, info.t, info.arcR, -Math.PI*3/2, Math.PI/2)
        }
        ctx.stroke()
        ctx.lineWidth = 1
      }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(this.room.stage, this.w/2, info.t)
    },
    drawPlayers () {
      let ctx = this.ctx
      let info = PosInfo.player
      for (let i in this.room.users) {
        let user = this.room.users[i]
        ctx.fillText(user.hp, this.w/2+info.l, info.t+info.sph*i)
        ctx.fillText(user.name, this.w/2+info.l+info.spw, info.t+info.sph*i)
      }
    },
    drawDamageDisplay () {
      let ctx = this.ctx
      for (let i in this.game.damageDisplays) {
        this.game.damageDisplays[i].draw(ctx)
      }
    }
  }
}
</script>

<style lang="scss">
// html {
//   height: 100%;
// }
// body {
//   margin: 0;
//   height: 100%;
// }
// #app {
//   position: relative;
//   font-family: Helvetica, Arial, sans-serif;
//   -webkit-font-smoothing: antialiased;
//   -moz-osx-font-smoothing: grayscale;
//   height: 100%;
//   text-align: center;
//   color: #2c3e50;
// }
.game {
  height: 100%;
}
.show {
  position: fixed;
  padding: 5px;
  width: 10rem;
  height: 6rem;
  font-size: 0.75rem;
  color: #4d373a;
  background-color: #d3cdbf;
}
.attr {
  display: flex;
  flex-wrap: wrap;
  text-align: left;
  div {
    flex: 0 0 auto;
    width: 25%;
  }
}
.buff {
  display: flex;
  flex-wrap: wrap;
  text-align: left;
  font-size: .25rem;
  div {
    flex: 0 0 auto;
    width: 25%;
  }
}
</style>
