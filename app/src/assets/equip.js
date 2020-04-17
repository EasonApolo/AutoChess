import { buff_val } from "./chess"
import { removeFromArr } from "./helper"

export const merge_map = {
  1:{
    1: 0
  }
}
export class equip {
  constructor (vm, lvl) {
    this.vm = vm
    this.chess = undefined
    this.lvl = lvl
    this.buffs = []
  }
  unequipTo () {
    for (let i in this.buffs) {
      removeFromArr(this.chess.equips, this.buffs[i])
    }
  }
}
export default [
  class rapid_firecannon extends equip {
    constructor (vm) {
      super(vm, 1)
      this.id = 0
      this.src = 'rapid_fire_cannon.png'
      this.name = '疾射火炮'
    }
    equipTo (chess) {
      this.chess = chess
      let buff0 = new buff_val(this.vm, this.chess, 'as', 0.4, 1, '攻速_疾射火炮')
      let buff1 = new buff_val(this.vm, this.chess, 'range', 1, 1, '射程_疾射火炮')
      this.buffs = [buff0, buff1]
      this.chess.buff = this.chess.buff.concat(this.buffs)
    }
  },
  
  class recurve_bow extends equip {
    constructor (vm) {
      super(vm, 0)
      this.id = 1
      this.src = 'RecurveBow.png'
      this.name = '反曲之弓'
    }
    equipTo (chess) {
      this.chess = chess
      let buff0 = new buff_val(this.vm, this.chess, 'as', 0.2, 1, '攻速_反曲之弓')
      this.buffs = [buff0]
      this.chess.buff = this.chess.buff.concat(this.buffs)
    }
  }
]