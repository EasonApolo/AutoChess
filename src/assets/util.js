import { removeFromArr } from "./helper";
import { buff_tristana_explosiveSpark } from "./chess";

export class util_tgt {
  constructor (vm, src, tgt) {
    this.src = src
    this.tgt = tgt
    this.vm = vm
    this.coord = this.vm.getCoord(...src.pos)
    this.status = {prepare:true}
    this.vm.util.push(this)
  }
  act () {
    let [x, y] = this.coord
    let [tx, ty] = this.vm.getCoord(...this.tgt.pos)
    if (x === tx && y === ty) {
      this.status.ready=true
      this.status.prepare = false
    }
    let d = this.vm.getEuclid(x, y, tx, ty)
    let dsp = this.sp/60/d
    if (dsp>1) {  // arrive tgt
      this.coord[0] = tx
      this.coord[1] = ty
    } else {
      this.coord[0] = x + dsp*(tx-x)
      this.coord[1] = y + dsp*(ty-y)
    }
  }
  effect () {
    this.vm.damage(this)
    removeFromArr(this.vm.util, this)
  }
}
export class util_attack extends util_tgt {
  constructor (vm, src, tgt) {
    super(vm, src, tgt)
    this.damage = src.ad
    this.sp = src.util.sp
    this.type = 0
  }
  draw (ctx, xbase, ybase) {
    ctx.fillStyle = 'blue'
    ctx.fillRect(xbase+this.coord[0]-5, ybase+this.coord[1]-5, 10, 10)
  }
}
export class util_obama_second_bullet extends util_tgt {
  constructor (vm, src, tgt, damage) {
    super(vm, src, tgt)
    this.sp = src.util.sp
    this.size = src.util.sz
    this.damage = damage
    this.type = 1
  }
  draw (ctx, xbase, ybase) {
    ctx.fillStyle = 'white'
    ctx.fillRect(xbase+this.coord[0]-this.size/2, ybase+this.coord[1]-this.size/2, this.size, this.size)
    ctx.strokeStyle = 'black'
    ctx.strokeRect(xbase+this.coord[0]-this.size/2, ybase+this.coord[1]-this.size/2, this.size, this.size)
  }
}
export class util_tristana_bomb extends util_tgt {
  constructor (vm, src, tgt) {
    super(vm, src, tgt)
    this.sp = src.util.bomb_sp
    this.size = src.util.bomb_sz
    this.type = 1
  }
  draw (ctx, xbase, ybase) {
    ctx.fillStyle = 'red'
    ctx.fillRect(xbase+this.coord[0]-this.size/2, ybase+this.coord[1]-this.size/2, this.size, this.size)
    ctx.strokeStyle = 'black'
    ctx.strokeRect(xbase+this.coord[0]-this.size/2, ybase+this.coord[1]-this.size/2, this.size, this.size)
  }
  effect () {
    this.tgt.buff.push(new buff_tristana_explosiveSpark(this.vm, this.src, this.tgt))
    removeFromArr(this.vm.util, this)
  }
}
export class util_area {
  constructor (vm, src, grids) {
    this.vm = vm,
    this.vm.util.push(this)
    this.src = src,
    this.grids = grids
    this.status = {prepare:true}
  }
}
export class util_yasuo_tempest extends util_area {
  constructor (vm, src, grids) {
    super(vm, src, grids)
    this.base = [150, 350, 550]
    this.damage = this.base[this.src.lvl]
    this.type = 1
    this.pre = 20
    this.post = 20
  }
  act () {
    if (this.status.prepare) {
      if (this.pre <= 0) {
        this.status = {ready:true}
      } else {
        this.pre --
      }
    } else if (this.status.done) {
      if (this.post <= 0) {
        removeFromArr(this.vm.util, this)
      }
    }
  }
  effect () {
    this.status = {done:true}
    for (let i in this.grids) {
      let pos = this.grids[i]
      let tgt = this.vm.board.grid[pos[0]][pos[1]]
      if (tgt && tgt.camp !== this.src.camp) {
        this.vm.damage(this, tgt)
      }
    }
  }
  draw (ctx, xbase, ybase) {
    ctx.lineWidth = 10
    ctx.strokeStyle = '#666'
    ctx.beginPath()
    let srcPos = this.vm.getCoord(...this.grids[0])
    let tgtPos = this.vm.getCoord(...this.grids[1])
    srcPos = [srcPos[0]+xbase,srcPos[1]+ybase]
    tgtPos = [tgtPos[0]+xbase,tgtPos[1]+ybase]
    ctx.moveTo(...srcPos)
    ctx.lineTo(...tgtPos)
    ctx.stroke()
    ctx.lineWidth = 1
  }
}