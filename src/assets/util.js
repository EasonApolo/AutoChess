import { removeFromArr, randInt } from "./helper";
import { buff_tristana_explosiveSpark, buff_val } from "./chess";
import PosInfo from './position'
import { timingSafeEqual } from "crypto";

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
    if (src.crit*100 > randInt(100)) {
      this.damage = src.ad * src.crit_fold
    } else {
      this.damage = src.ad
    }
    this.sp = src.util.sp
    this.vm.dealBuff('util_type', this.src)
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
    this.type = 1
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
    this.type = 0
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
    this.type = 1
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
        this.now = 0
        let grids = this.vm.board.grid
        for (let r in grids) {
          for (let c in grids[r]) {
            if (grids[r][c] && grids[r][c].camp!=this.src.camp
              && this.vm.getDistance(...this.pos, r, c) <= this.radius) {
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


export class util_varus_arrow extends util_area{
  constructor (vm, src) {
    super(vm, src)
    this.d = PosInfo.board.w1*16
    let tgtCoord = this.vm.getCoord(...this.src.status.target.pos)
    let srcCoord = this.vm.getCoord(...this.src.pos)
    let r = this.d / this.vm.getEuclid(...tgtCoord, ...srcCoord)
    this.d_x = (tgtCoord[0] - srcCoord[0]) * r
    this.d_y = (tgtCoord[1] - srcCoord[1]) * r
    this.x0 = srcCoord[0]
    this.y0 = srcCoord[1]
    this.x = this.x0
    this.y = this.y0
    this.now = 0
    this.rate = 0
    this.pre = 60
    this.post = 60
    this.base = [300, 550, 800]
    this.damage = this.base[this.src.lvl]
    this.type = 2
    this.w = 20
    this.been = []
  }
  act () {
    if (this.status.prepare) {
      this.now ++
      this.rate = this.now / this.pre
      this.x = this.x0 + this.rate * this.d_x
      this.y = this.y0 + this.rate * this.d_y
      if (this.now % 2 === 0) {
        let pos = this.vm.getPosByCoord(this.x+this.vm.xbase, this.y+this.vm.ybase)
        if (!pos) return  // out of board
        let tgt = this.vm.board.grid[pos[0]][pos[1]]
        if (tgt && this.been.findIndex(v=>this.vm.samePos(v,pos)) < 0) {
          this.vm.damage(this, tgt)
          this.been.push(pos)
        }
      }
      if (this.now >= this.pre) {
        this.status = {done: true}
        this.now = 0
      }
    } else if (this.status.done) {
      if (this.now === this.post) {
        removeFromArr(this.vm.util, this)
      }
      this.now ++
    }
  }
  draw (ctx, xbase, ybase) {
    let end_x = this.x-this.d_x*0.1
    let end_y = this.y-this.d_y*0.1
    let grd = ctx.createLinearGradient(this.x+xbase, this.y+xbase, end_x+xbase, end_y+xbase)
    grd.addColorStop(0, 'black')
    grd.addColorStop(1, 'white')
    ctx.strokeStyle = grd
    if (this.status.prepare) {
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(this.x+xbase, this.y+ybase)
      ctx.lineTo(end_x+xbase, end_y+ybase)
      ctx.stroke()
      ctx.lineWidth = 1
    }
  }
}


export class util_ashe_arrow extends util_area{
  constructor (vm, src, pos) {
    super(vm, src)
    this.d = PosInfo.board.w1*30
    let tgtCoord = this.vm.getCoord(...pos)
    let srcCoord = this.vm.getCoord(...this.src.pos)
    let r = this.d / this.vm.getEuclid(...tgtCoord, ...srcCoord)
    this.d_x = (tgtCoord[0] - srcCoord[0]) * r
    this.d_y = (tgtCoord[1] - srcCoord[1]) * r
    this.x0 = srcCoord[0]
    this.y0 = srcCoord[1]
    this.x = this.x0
    this.y = this.y0
    this.now = 0
    this.rate = 0
    this.pre = 120
    this.base = [200, 400, 600]
    this.damage = this.base[this.src.lvl]
    this.base_stun = [1, 1.5, 2]
    this.stun = this.base_stun[this.src.lvl] * 60
    this.stun_type = 0
    this.type = 1
  }
  act () {
    this.now ++
    this.rate = this.now / this.pre
    this.x = this.x0 + this.rate * this.d_x
    this.y = this.y0 + this.rate * this.d_y
    if (this.now % 2 === 0) {
      let pos = this.vm.getPosByCoord(this.x+this.vm.xbase, this.y+this.vm.ybase)
      if (!pos) return  // out of board
      let tgt = this.vm.board.grid[pos[0]][pos[1]]
      if (tgt && tgt.camp !== this.src.camp) {
        this.vm.damage(this, tgt)
        this.vm.stun(this, tgt)
        removeFromArr(this.vm.util, this)
      }
    }
    if (this.now === this.pre) {
      removeFromArr(this.vm.util, this)
    }
  }
  draw (ctx, xbase, ybase) {
    let end_x = this.x-this.d_x*0.1
    let end_y = this.y-this.d_y*0.1
    ctx.strokeStyle = 'rgb(180,180,255)'
    if (this.status.prepare) {
      ctx.lineWidth = 20
      ctx.beginPath()
      ctx.moveTo(this.x+xbase, this.y+ybase)
      ctx.lineTo(end_x+xbase, end_y+ybase)
      ctx.stroke()
      ctx.lineWidth = 1
    }
  }
}

export class util_mordekaiser_obliterate extends util_area{
  constructor (vm, src) {
    super(vm, src)
    this.base = [250, 500, 750]
    this.damage = this.base[this.src.lvl]
    this.type = 1
    this.orient = this.vm.getOrient(...src.pos, ...src.status.target.pos)
    let p1 = this.vm.getOrientGrid(src.pos, this.orient)
    if (p1) {
      let c = this.vm.board.grid[p1[0]][p1[1]]
      if (c && c.camp != this.src.camp) {
        this.vm.damage(this, c)
      }
      let p2 = this.vm.getOrientGrid(p1, this.orient)
      if (p2) {
        let c = this.vm.board.grid[p2[0]][p2[1]]
        if (c && c.camp != this.src.camp) {
          this.vm.damage(this, c)
        }
      }
    }
    this.start = this.vm.getBasedCoord(...this.src.pos)
    let w = PosInfo.board.w1*PosInfo.board.ratio
    let l = w*5
    let rad = (2-this.orient)*Math.PI/3
    let cos = Math.cos(rad)
    let sin = Math.sin(rad)
    let dx = l*cos
    let dy = -l*sin
    this.end = [this.start[0]+dx, this.start[1]+dy]
    this.now = 0
    this.post = 60
  }
  act () {}
  draw (ctx) {
    this.now++
    if (this.now === this.post) {
      removeFromArr(this.vm.util, this)
    }
    ctx.lineWidth = 120
    ctx.strokeStyle = `rgba(230, 230, 230, ${1-this.now/this.post})`
    ctx.beginPath()
    ctx.moveTo(this.start[0], this.start[1])
    ctx.lineTo(this.end[0], this.end[1])
    ctx.stroke()
    ctx.lineWidth = 1
  }
}

export class util_ahri_orb extends util_area {
  constructor (vm, src) {
    super(vm, src)
    this.base = [100, 200, 300]
    this.damage = this.base[this.src.lvl]
    this.type = 1
    if (this.src.status.target) {
      let tgtCoord = this.vm.getCoord(...this.src.status.target.pos)
      let srcCoord = this.vm.getCoord(...this.src.pos)
      let dx_ = tgtCoord[0]-srcCoord[0]
      let dy_ = tgtCoord[1]-srcCoord[1]
      let w = PosInfo.board.w1*PosInfo.board.ratio
      let l = w*5
      let d_ = Math.sqrt(dx_*dx_+dy_*dy_)
      this.dx = l/d_*dx_    // transition distance
      this.dy = l/d_*dy_
      this.start = srcCoord // start position
    }
    this.x = this.start[0]  // current position
    this.y = this.start[1]
    this.been = []
    this.now = 0
    this.pre = 45
    this.post = 45
    this.w = 30
  }
  act () {
    this.now++
    if (this.status.prepare) {
      if (this.now === this.pre) {
        this.now = 0
        this.been = []
        this.status = {done:true}
      }
      this.x = this.start[0] + this.now / this.pre * this.dx
      this.y = this.start[1] + this.now / this.pre * this.dy
    } else if (this.status.done) {
      if (this.now === this.post) {
        removeFromArr(this.vm.util, this)
      }
      this.x = this.start[0] + (this.post-this.now) / this.post * this.dx
      this.y = this.start[1] + (this.post-this.now) / this.post * this.dy
    }
    if (this.now %2 === 0) {
      let pos = this.vm.getPosByCoord(this.x+this.vm.xbase, this.y+this.vm.ybase)
      let chess = this.vm.board.grid[pos[0]][pos[1]]
      if (chess && chess.camp != this.src.camp && this.been.find(v => this.vm.samePos(v, pos))===undefined) {
        this.vm.damage(this, chess)
        this.been.push(pos)
      }
    }
  }
  draw (ctx, xbase, ybase) {
    ctx.fillStyle = `#8495da`
    ctx.beginPath()
    ctx.arc(this.x+xbase, this.y+ybase, this.w, 0, Math.PI*2)
    ctx.fill()
  }
}

export class util_khazix_tastetheirfear extends util_tgt {
  constructor (vm, src, tgt) {
    super(vm, src, tgt)
    this.sp = src.util.sp
    this.size = src.util.sz
    this.damage_base = [150, 250, 350]
    this.isolation_base = [400,600,800]
    this.type = 1
  }
  get damage () {
    let six = this.vm.getSixPos(this.tgt.pos)
    let isolation = true
    for (let i in six) {
      let chess = this.vm.board.grid[six[i][0]][six[i][1]]
      if (chess && chess.camp != this.src.camp) {
        isolation = false
        break
      }
    }
    let damage = this.damage_base[this.src.lvl]
    if (isolation) damage += this.isolation_base[this.src.lvl]
    return damage
  }
  set damage (dmg) {}
  draw (ctx, xbase, ybase) {
    ctx.fillStyle = 'white'
    ctx.fillRect(xbase+this.coord[0]-this.size/2, ybase+this.coord[1]-this.size/2, this.size, this.size)
    ctx.strokeStyle = 'black'
    ctx.strokeRect(xbase+this.coord[0]-this.size/2, ybase+this.coord[1]-this.size/2, this.size, this.size)
  }
}

export class util_shen_spirits_refuge extends util_area {
  constructor (vm, src, tgt) {
    super(vm, src, tgt)
    this.duration_base = [3,4,5]
    this.duration = this.duration_base[this.src.lvl] * 60
    this.now = 0
    this.w = PosInfo.board.w1 * PosInfo.board.ratio * 2.5
  }
  act () {
    if (this.now % 30 == 0) {
      let six = this.vm.getSixPos(this.src.pos)
      let grids = this.vm.grid
      for (let i in six) {
        let tgt = grids[six[i][0]][six[i][1]]
        if (tgt != undefined && tgt.camp == this.src.camp) {
          tgt.buff.push(new buff_val(this.vm, this.src, 'dodge', 0, 1, '灵魂庇护', 1*30))
        }
      }
    }
    this.now ++
    if (this.now == this.duration) {
      removeFromArr(this.vm.util, this)
    }
  }
  draw (ctx) {
    let x, y = this.vm.getBasedCoord(this.src.pos)
    ctx.fillStyle = 'rgba(176, 208, 255, 0.5)'
    ctx.beginPath()
    ctx.arc(x, y, this.w, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(176, 208, 255, 0.9)'
    ctx.beginPath()
    ctx.lineWidth = '3px'
    ctx.arc(x, y, this.w, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = '1px'
  }
}

export class util_veigar_primordial_burst extends util_tgt {
  constructor (vm, src, tgt) {
    super(vm, src, tgt)
    this.sp = src.util.spell_sp
    let flag = this.tgt.lvl < this.src.lvl
    if (flag) {
      this.damage = 100000
      this.type = 2
    } else {
      this.damage = [350, 650, 950][this.src.lvl]
      this.type = 1
    }
  }
  draw (ctx) {
    let x, y = this.vm.getBasedCoord(this.src.pos)
    ctx.fillStyle = '#1e1aa5'
    ctx.beginPath()
    ctx.arc(x, y, 80, 0, 2*Math.PI)
    ctx.fill()
  }
  effect () {
    this.vm.damage(this, this.tgt)
    removeFromArr(this.vm.util, this)
  }
}


export class util_karthus_requiem extends util_area {
  constructor (vm, src) {
    super(vm, src, tgt)
    this.now = 0
    this.duration = this.src.spell_post
    this.post = 45
    this.damage = [350, 600, 850][this.src.lvl]
    this.type = 1
    this.tgts = []
    let grids = this.vm.grid
    let avails = []
    for (let r in grids) {
      for (let c in grids[r]) {
        let tgt = grids[r][c]
        if (tgt && tgt.camp != this.camp) {
          avails.push([r,c])
        }
      }
    }
    for (let i = 0; i < this.util.n_tgt; i++) {
      let pos = splice(randInt(avails.length), 1)
      let tgt = grids[pos[0]][pos[1]]
      if (tgt) {
        this.tgts.push(tgt)
      }
    }
  }
  act () {
    this.now++
    if (this.status.prepare && this.now == this.duration) {
      for (let i in this.tgts) {
        this.vm.damage(this, this.tgts[i])
      }
      this.status = {done:true}
      this.now = 0
    }
    if (this.status.done && this.now == this.post) {
      removeFromArr(this.vm.util, this)
    }
  }
  draw (ctx) {
    let opacity = this.status.prepare ? this.now/this.duration*0.3+0.1 : 1-this.now/this.post
    for (let i in this.tgts) {
      let pos = this.tgts[i].pos
      let x, y = this.vm.getBasedCoord(pos)
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
      ctx.fillRect(x-10, y+10, 20, -300)
    }
  }
}