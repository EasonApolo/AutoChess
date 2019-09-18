import { buff_val } from "./chess"

export class equip {
  constructor (vm) {
    this.vm = vm
    this.chess = undefined
  }
}
export default [
  class rapid_firecannon extends equip {
    constructor (vm) {
      super(vm)
      this.src = 'rapid_fire_cannon.png'
      this.id = 0
      this.name = '疾射火炮'
    }
    equipTo (chess) {
      this.chess = chess
      let buff0 = new buff_val(this.vm, this.chess, 'as', 0.4, 1, '攻速_疾射火炮')
      let buff1 = new buff_val(this.vm, this.chess, 'range', 1, 1, '射程_疾射火炮')
      this.chess.buff = this.chess.buff.concat([buff0, buff1])
    }
  }
]