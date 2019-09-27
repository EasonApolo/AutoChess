import { removeFromArr } from "./helper";
import { buff_tristana_explosiveSpark } from "./chess";
import PosInfo from './position'

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
export class util_lucian_second_bullet extends util_tgt {
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
  constructor (vm, src) {
    this.vm = vm,
    this.vm.util.push(this)
    this.src = src,
    this.status = {prepare:true}
  }
}
export class util_yasuo_tempest extends util_area {
  constructor (vm, src, start, end) {
    super(vm, src)
    this.base = [150, 350, 550]
    this.damage = this.base[this.src.lvl]
    this.start = start
    this.end = end
    this.width = 10
    this.type = 1
    this.pre = 5
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
      } else {
        this.post --
      }
    }
  }
  effect () {
    this.status = {done:true}
    let g1 = [(this.start[0]+this.end[0])/2, (this.start[1]+this.end[1])/2]
    let g2 = this.end
    let grids = this.vm.board.grid
    for (let r in grids) {
      for (let c in grids) {
        if (grids[r][c] !== undefined && this.vm.getDistance(...this.src.pos, r, c) < 3 && this.src.camp !== grids[r][c].camp) { // only compute possible grid
          if (this.vm.getEuclid(...g1, ...(this.vm.getCoord(r, c))) < (66 + 10) || this.vm.getEuclid(...g2, ...(this.vm.getCoord(r, c))) < (66+10)) {
            this.vm.damage(this, grids[r][c])
          }
        }
      }
    }
  }
  draw (ctx, xbase, ybase) {
    let opacity = this.pre > 0 ? 1-this.pre/5 : this.post / 20
    ctx.lineWidth = 5
    ctx.strokeStyle = `rgba(222, 222, 222, ${opacity})`
    ctx.beginPath()
    let srcPos = [this.start[0]+xbase,this.start[1]+ybase]
    let tgtPos = [this.end[0]+xbase,this.end[1]+ybase]
    ctx.moveTo(...srcPos)
    ctx.lineTo(...tgtPos)
    ctx.stroke()
    ctx.lineWidth = 1
  }
}
export class util_yasuo_tornado extends util_area{
  constructor (vm, src, x_len, y_len) {
    super(vm, src)
    this.w = 0    // radius
    this.sp = 90  // finish in 60 ticks
    this.now = 0  // current tick
    this.len = PosInfo.board.w1 * 10  // total length
    this.start = this.vm.getCoord(...src.pos)              // start pos
    this.pos = this.start
    this.x_len = x_len
    this.y_len = y_len
    this.been = []
    this.post = 20
    this.base = [150, 350, 550]
    this.damage = this.base[this.src.lvl]
    this.stun = 1.5 * 60
    this.stun_type = 0
  }
  act () {
    if (this.status.prepare) {
      if (this.now === this.sp) {
        this.status = {done:true}
        this.post = this.sp/3
        return
      }
      let rate = this.now / this.sp
      this.w = this.now
      this.pos = [rate*this.x_len + this.start[0], rate*this.y_len + this.start[1]]
      let grids = this.vm.board.grid
      for (let r in grids) {
        for (let c in grids[r]) {
          if (grids[r][c] !== undefined && grids[r][c].camp !== this.src.camp && this.been.indexOf(grids[r][c]) < 0) {
            // console.log(grids[r][c], this.been, this.been.indexOf(grids[r][c]))
            if (this.vm.getEuclid(...this.pos, ...this.vm.getCoord(r,c)) < (66 + this.w)) {
              this.vm.damage(this, grids[r][c])
              if (grids[r][c]) {
                this.vm.stun(this, grids[r][c])
              }
              this.been.push(grids[r][c])
            }
          }
        }
      }
      this.now++
    } else if (this.status.done) {
      this.w = this.post*3
      if (this.post <= 0) {
        removeFromArr(this.vm.util, this)
      }
      this.post --
    }
  }
  draw (ctx, xbase, ybase) {
    ctx.strokeStyle = 'rgb(200,200,200)'
    ctx.lineWidth = '5'
    ctx.beginPath()
    ctx.arc(this.pos[0]+xbase, this.pos[1]+ybase, this.w, 0, 2*Math.PI)
    ctx.stroke()
    ctx.lineWidth = '1'
  }
}


export class util_graves_buckshot extends util_area{
  constructor (vm, src, xys) {
    super(vm, src)
    this.w = 20   // radius
    this.sp = 10  // finish in 60 ticks
    this.now = 0  // current tick
    this.start = this.vm.getCoord(...src.pos)              // start pos
    this.xys = xys
    this.pos = xys.map(v => this.start)
    this.been = [this.src.status.target]
    this.post = 20
    this.damage = this.src.ad
  }
  act () {
    if (this.status.prepare) {
      if (this.now === this.sp) {
        this.status = {done:true}
        return
      }
      let rate = this.now / this.sp
      for (let i in this.xys) {
        this.pos[i] = [this.start[0]+this.xys[i][0]*rate, this.start[1]+this.xys[i][1]*rate]
      }
      let grids = this.vm.board.grid
      for (let r in grids) {
        for (let c in grids[r]) {
          if (grids[r][c] !== undefined && grids[r][c].camp !== this.src.camp && this.been.indexOf(grids[r][c]) < 0) {
            for (let i in this.pos) {
              if (this.vm.getEuclid(...this.pos[i], ...this.vm.getCoord(r,c)) < (66 + this.w)) {
                this.vm.damage(this, grids[r][c])
                this.been.push(grids[r][c])
                break
              }
            }
          }
        }
      }
      this.now++
    } else if (this.status.done) {
      if (this.post <= 0) {
        removeFromArr(this.vm.util, this)
      }
      this.post --
    }
  }
  draw (ctx, xbase, ybase) {
    ctx.strokeStyle = this.status.prepare ? '#eec545' : `rgba(238,197,69,${this.post/20})`
    ctx.lineWidth = '3'
    for (let i in this.pos) {
      ctx.beginPath()
      ctx.moveTo(this.start[0]+xbase, this.start[1]+ybase)
      ctx.lineTo(this.pos[i][0]+xbase, this.pos[i][1]+ybase)
      ctx.stroke()
    }
    ctx.lineWidth = '1'
  }
}

export class util_aatrox_blade extends util_area{
  constructor (vm, src, pos) {
    super(vm, src)
    let info = PosInfo.board
    this.w = info.w1*2    // radius
    this.now = 0  // current tick
    this.pos = pos
    this.coord = this.vm.getCoord(...pos)
    this.post = 45
    this.base = [300, 600, 900]
    this.damage = this.base[this.src.lvl]
  }
  act () {
    if (this.status.prepare) {
      this.status = {done: true}
      let sixPos = this.vm.getSixPos(this.pos)
      sixPos.push(this.pos)
      let grids = this.vm.board.grid
      for (let i in sixPos) {
        let pos = sixPos[i]
        let grid = grids[pos[0]][pos[1]]
        if (grid && grid.camp!=this.src.camp) {
          this.vm.damage(this, grid)
        }
      }
    } else if (this.status.done) {
      if (this.now >= this.post) {
        removeFromArr(this.vm.util, this)
      }
      this.now ++
    }
  }
  draw (ctx, xbase, ybase) {
    let opacity = 1 - this.now / this.post
    ctx.fillStyle = `rgba(59,09,25,${opacity})`
    ctx.beginPath()
    ctx.arc(this.coord[0]+xbase, this.coord[1]+ybase, this.w, 0, 2*Math.PI)
    ctx.fill()
  }
}


export class util_chogath_rupture extends util_area{
  constructor (vm, src, pos) {
    super(vm, src)
    this.w = PosInfo.board.w1*6
    this.radius = 3
    this.pos = pos
    this.coord = this.vm.getCoord(...pos)
    this.now = 0  // current tick
    this.pre = 90
    this.post = 60
    this.base = [175, 350, 525]
    this.damage = this.base[this.src.lvl]
    this.base_stun = [1.5, 1.75, 2]
    this.stun = this.base_stun[this.src.lvl] * 60
    this.stun_type = 0
  }
  act () {
    if (this.status.prepare) {
      this.now++
      if (this.now === this.pre) {
        this.status = {done: true}
        let grids = this.vm.board.grid
        for (let r in grids) {
          for (let c in grids[r]) {
            if (grids[r][c] && grids[r][c].camp!=this.src.camp
              && this.vm.getDistance(...this.pos, r, c) <= this.radius) {
                console.log(grids[r][c])
                this.vm.stun(this, grids[r][c])
                this.vm.damage(this, grids[r][c])
            }
          }
        }
      }
    } else if (this.status.done) {
      if (this.now === this.post) {
        removeFromArr(this.vm.util, this)
      }
      this.now ++
    }
  }
  draw (ctx, xbase, ybase) {
    let opacity = 0.5
    if (this.status.prepare) {
      ctx.fillStyle = `rgba(55,28,131,${opacity})`
    } else {
      opacity = 1 - this.now / this.post
      ctx.fillStyle = `rgba(55,28,131,${opacity})`
    }
    ctx.beginPath()
    ctx.arc(this.coord[0]+xbase, this.coord[1]+ybase, this.w, 0, 2*Math.PI)
    ctx.fill()
    ctx.lineWidth = '7'
    ctx.strokeStyle = `rgba(55,28,131,${opacity})`
    ctx.beginPath()
    ctx.arc(this.coord[0]+xbase, this.coord[1]+ybase, this.w, 0, 2*Math.PI)
    ctx.stroke()
    ctx.lineWidth = '1'
  }
}