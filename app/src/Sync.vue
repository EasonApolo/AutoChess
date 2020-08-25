<script>
import CardInfo from './assets/card'
import EquipInfo, { equip, merge_map } from './assets/equip'

export default {
  data () {
    return {
      ws: {
        ip: `ws://localhost:81/`,
        rooms: undefined,
        room: undefined,
        card: undefined,
        chess: undefined,
      },
    }
  },
  watch: {
    'game.gold': function (new_val, old_val) {
      this.ws.gold.send(new_val)
    },
    'game.exp': function (new_val, old_val) {
      this.syncExp('update')
    },
    'game.lvl': function (new_val, old_val) {
      this.syncExp('update')
    },
    'game.turn': function (new_val, old_val) {
      if (old_val != undefined) {
        this.syncChess('init')
      }
    },
    'game.stage': function (new_val, old_val) {
      if (new_val == 0) {
        this.game.time = this.game.stage0Time
      }
    }
  },
  methods: {
    // Gold and Exp
    wsGame () {
      let timer
      this.ws.game = new WebSocket(`${ this.ws.ip }game?rid=${ this.room.id }&uid=${ this.user.id }`)
      this.ws.game.onmessage = e => {
        let data = JSON.parse(e.data)
        if (data.type == 'turn') {
          this.game.turn = data.turn, this.game.stage = data.stage, this.game.time = data.time
          if (this.game.stage == 0) {
            timer = setInterval(() => {
              this.game.time > 0 && this.game.time--
            }, 1000)
          }
          else if (this.game.stage == 1) {
            this.game.oppoId = parseInt(data.oppo.board[0])
            this.addChessByData(data.oppo.board[1].board, 1)
            this.startRound()
          }
        } else if (data.type == 'updatePlayersInfo') {
          this.game.players = data.playersInfo
        }
      }
    },
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
        let { hand, board, equips } = JSON.parse(e.data)
        hand.map((c, idx) => {
          if (c.id >= 0) {
            let newChess = this.createChess(c.id, 0, c.lvl)
            if (c.eqp) {
              this.equipingByData(newChess, c.eqp)
            }
            this.hand.cards.splice(idx, 1, newChess)
          }
        })
        this.addChessByData(board, 0)
        equips.map((e, idx) => {
          if (e.id >= 0) {
            this.equips[idx] = new EquipInfo[e.id]()
          }
        })
      }
    },
    syncChess (type) {
      let data
      if (type == 'init') {
        data = { type: type }
      } else {
        let extract = (objArr, isEquip=false) => {
          return objArr.map(c => {
            let ret = {}
            if (c?.id != undefined) {
              ret = isEquip ? {id: c.id} : { id: c.id, lvl: c.lvl }
              if (c.equips?.length > 0) ret.eqp = c.equips.map(e => ({ id: e.id }))
            }
            return ret
          })
        }
        let board = this.board.grid.map(row => extract(row))
        let hand = extract(this.hand.cards)
        let equips = extract(this.equips)
        data = { type: type, board: board, hand: hand, equips: equips }
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
    syncStore (type, card=undefined) {
      let extract = c => ({ id: c.id, lvl: c.cost-1 })  // cost from 1, card lvl from 0, do transformation
      let current = card ? [extract(card)] : this.store.cards.map(extract)
      let data = { type: type, cards: current}
      this.ws.card.send(JSON.stringify(data))
    },
  }
}
</script>