<script>
import CardInfo from './assets/card'
import ChessInfo, { chess, buff_regainMana } from './assets/chess'
import EquipInfo, { equip, merge_map } from './assets/equip'
import ClassInfo from './assets/class'
export default {
  data () {
    return {
    }
  },
  computed: {
    getClassInfo () {
      return (c) => {
        return ClassInfo[c]
      }
    },
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
    },
    showSell () {
      return this.hold && this.hold instanceof chess
    },
    stageName () {
      return ['准备', '战斗'][this.game.stage]
    }
  },
  methods: {
    traverseGrid(cond, todo, ret) {
      let grids = this.board.grid
      for (let r in grids) {
        for (let c in grids[r]) {
          if (cond(grids[r][c], [r, c])) {
            todo(ret, grids[r][c], [r, c])
          }
        }
      }
      return ret
    },
    traverseHand(cond, todo, ret) {
      let cards = this.hand.cards
      for (let i in cards) {
        if (cond(cards[i], i)) {
          todo(ret, cards[i], i)
        }
      }
      return ret
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
      } else {
        this.dealError('No more places~')
      }
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
      if (chess == undefined) {  // swap hold and grid[i][j]
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
    getGrid ([r, c]) {
      return this.board.grid[r][c]
    },
    getChessByPos (pos) {
      return pos instanceof Array ? this.getGrid(pos) : this.hand.cards[pos]
    },
    addChess (cardId) {
      let cards = this.hand.cards
      let grids = this.board.grid
      // count
      let count = [[], [], []]
      let cond = c => c?.id == cardId
      let todo = (ret, c, pos) => ret[c.lvl].push(pos)
      this.traverseGrid(cond, todo, count)
      this.traverseHand(cond, todo, count)
      // upgrade if count enough
      let flag_addOK = count[0].length == 2
      let set = (pos, chess) => {
        pos instanceof Array ? this.setChess(...pos, chess) : cards[pos] = chess
      }
      let compose = (poses, lvl) => {
        let equips = []
        poses.map(pos => {
          let chess = this.getChessByPos(pos)
          for (let i = chess.equips.length - 1; i >= 0; i--) {
            equips.push(chess.unequip(i))
          }
          set(pos, {})
        })
        let composedChess = this.createChess(cardId, 0, lvl)
        set(poses[0], composedChess)
        for (let i in equips) {
          this.equiping(composedChess, equips[i]) || this.depositEquipment(equips[i])
        }
      }
      if (count[0].length == 2) {
        compose(count[0], 1)
        if (count[1].length == 2) {
          compose(count[1], 2)
        }
      }
      if (!flag_addOK) {
        for (let i in cards) {
          if (cards[i].id == undefined) {
            cards[i] = this.createChess(cardId, 0, 0)
            flag_addOK = true
            break
          }
        }
      }
      flag_addOK && this.syncChess('update')
      return flag_addOK
    },
    createChess (id, camp, lvl) {
      let obj = new ChessInfo[id](this, lvl)
      obj.hold = false         // init hold
      obj.pos = undefined
      obj._dodge = 0
      obj.status = {}
      obj.camp = camp
      obj.equips = []
      if (!this.allsrc.hasOwnProperty(id)) {
        this.allsrc[id] = CardInfo[id].src
      }
      return obj
    },

    getMergedEquip (id1, id2) {
      return merge_map[id1][id2] ?? merge_map[id2][id1]
    },
    depositEquipment (e) {
      for (let i in this.equips) {
        if (this.equips[i].id == undefined) {
          this.equips[i] = e
          return true
        }
      }
      this.dealError('No Room 4 Equipments Storage')
    },
    equiping (chess, providedEquip=undefined) {
      let outEquip = providedEquip ?? this.hold
      let flag_equipOK = false
      if (chess && outEquip instanceof equip) {
        // try merging
        if (outEquip.lvl == 0 && chess.equips?.length > 0) {
          for (let i in chess.equips) {
            let e = chess.equips[i]
            if (e.lvl > 0) continue
            let mergedId = this.getMergedEquip(e.id, outEquip.id)
            if (mergedId == undefined) continue
            chess.unequip(i)
            chess.equip(new EquipInfo[mergedId]())
            flag_equipOK = true
            break
          }
        }
        // not merged, try directly equip
        if (!flag_equipOK && chess.equip(outEquip)) {
          flag_equipOK = true
        }
        // if equiped and outEquip from this.hold, update hold
        if (flag_equipOK && providedEquip == undefined) {
          this.hold.hold = undefined
          this.hold = undefined
        }
      }
      return flag_equipOK
    },

    sellHoldChess () {
      if (!(this.hold instanceof chess)) this.dealError('Cannot Sell This :<')
      let lvl = this.hold.lvl
      let card = CardInfo[this.hold.id]
      let cost = card.cost
      let price
      switch (lvl) {
        case 0: price = cost;break;
        case 1: price = cost+2;break;
        case 2: price = cost+4;break;
      }
      this.game.gold += price
      // put chess.equips into this.equips, redundant are discarded
      for (let i = this.hold.equips?.length - 1; i >= 0; i--) {
        this.depositEquipment(this.hold.unequip(i))
      }
      console.log('sync')
      this.syncStore('sell', card)
      this.hold.hold = undefined
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
    // pos:     the original [r, c]
    // return:  reverse pos if camp == 1
    getPosByCamp (pos, camp) {
      if (camp == 1) {
        return [this.board.nrow - 1 - pos[0], this.board.ncol - 1 - pos[1]]
      } else { return pos }
    },
    // chess:   a chess (eg grid[r][c])
    // eqpdata: a array of eqp data
    equipingByData (chess, eqpData) {
      eqpData.map(e => {
        chess.equip(new EquipInfo[e.id]())
      })
    },
    addChessByData (board, camp) {
      board.map((rowData, r) => rowData.map((chessData, c) => {
        if (chessData.id >= 0) {
          let newChess = this.createChess(chessData.id, camp, chessData.lvl)
          if (chessData.eqp) {
            this.equipingByData(newChess, chessData.eqp)
          }
          let pos = this.getPosByCamp([r, c], camp)
          this.setChess(...pos, newChess)
        }
      }))
    }
  }
}
</script>