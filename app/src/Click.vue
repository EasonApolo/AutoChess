<script>
import ChessInfo, { chess, buff_regainMana } from './assets/chess'
import EquipInfo, { equip, merge_map } from './assets/equip'

export default {
  data () {
    return {
    }
  },
  methods: {
    deal () {
      if (this.game.gold < 2) {
        this.dealError('More Gold is Required')
        return
      }
      this.game.gold -= 2
      this.syncStore('deal')
    },
    clickEquip (e, index) {
      let flag_sync = true
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
      } else if (this.hold == undefined) {
        if (this.equips[index].id == undefined) return
        flag_sync = false
        this.hold = this.equips[index]
        this.hold.hold = { type: 'equip', id: index }
        this.equips[index] = {}
      }
      flag_sync && this.syncChess('update')
    },
    clickBoard (e) {
      let flag_sync = true
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
            flag_sync = false
          } else if (this.hold instanceof chess) {
            let tmp = this.hold
            this.hold.hold = undefined
            this.hold = grids[y][x]
            this.hold.hold = { type: 'board', pos: [y, x] }
            grids[y][x] = tmp
          } else if (this.hold instanceof equip) {
            if (!this.equiping(grids[y][x])) flag_sync = false
          }
        }
      }
      flag_sync && this.syncChess('update')
    },
    clickHand (c, index) {
      let flag_sync = true
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
          flag_sync = false
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
          if (!this.equiping(c)) {
            flag_sync = false
          }
        }
      }
      flag_sync && this.syncChess('update')
    },
  }
}
</script>