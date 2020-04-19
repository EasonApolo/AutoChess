import { util_lucian_second_bullet, util_tristana_bomb, util_yasuo_tempest, util_yasuo_tornado, util_graves_buckshot, util_aatrox_blade, util_chogath_rupture, util_varus_arrow, util_ashe_arrow, util_mordekaiser_obliterate, util_ahri_orb, util_khazix_tastetheirfear, util_veigar_primordial_burst, util_brand_pyroclasm } from "./util";
import { randInt, removeFromArr } from './helper'
import { setTimeout } from "core-js";
import PosInfo from './position'

export class buff {
  constructor (vm, src) {
    this.vm = vm
    this.src = src
  }
}

export class buff_regainMana extends buff {
  constructor (vm, src) {
    super(vm, src)
  }
  response (type, ...args) {
    if (['dmg', 'atk'].includes(type)) {
      if (type === 'dmg') {
        let val = args[0]
        let util = args[1]
        let regain = val * 0.1
        this.src.mp_ += regain
      } else if (type === 'atk') {
        this.src.mp_ += randInt(5, 6)
      }
      // prevent overflow
      if (this.src.mp_ >= this.src.mp) this.src.mp_ = this.src.mp
    }
  }
}

export class buff_lucian_nextAttackWith extends buff {
  constructor (vm, src, tgt) {
    super(vm, src)
    this.name = '圣枪银弹'
    this.tgt = tgt
    this.base = [100, 225, 350]
  }
  response (type, ...args) {
    if (type === 'atk') {
      setTimeout(() => {
        if (this.tgt) {
          new util_lucian_second_bullet(this.vm, this.src, this.tgt, this.base[this.src.lvl])
        }
      }, 300)
      removeFromArr(this.src.buff, this)
    }
  }
}

export class buff_tristana_explosiveSpark extends buff {
  constructor (vm, src, tgt) {
    super(vm, src)
    this.name = '爆炸火花'
    this.stage = 0
    this.tgt = tgt
    this.base = [150, 225, 300]
    this.lvl = src.lvl
    this.damage = 0
    this.type = 1
    this.duration = 240
  }
  response (type, ...args) {
    if (type === 'dmg') {
      let util = args[1]
      if (util.tgt === this.tgt && util.src === this.src) {
        this.stage ++
        if (this.stage >= 3) {
          this.explode()
        }
      }
    }
  }
  explode () {
    removeFromArr(this.tgt.buff, this)
    this.damage = (1 + this.stage * 0.5) * this.base[this.lvl]
    let sixpos = this.vm.getSixPos(this.tgt.pos)
    for (let i in sixpos) {
      let pos = sixpos[i]
      let adj = this.vm.board.grid[pos[0]][pos[1]]
      if (adj != undefined && adj.camp != this.src.camp) {
        this.vm.damage(this, adj)
      }
    }
    this.vm.damage(this)
  }
  draw (ctx, cenL, cenT) {
    this.now ++
    if (this.now === this.duration && this.damage === 0) this.explode() // this.damage=0 means it hasn't exploded, this is a flag
    ctx.fillStyle = 'red'
    let r = 6*(this.stage+1)
    ctx.fillRect(cenL-r, cenT-r,2*r,2*r)
  }
}
// type: ad / hp / armor / mr / as
export class buff_val extends buff {
  constructor (vm, src, type, val, rate=0, name=undefined, duration=undefined) {
    super(vm, src)
    this.type = type
    this.val = val
    this.rate = rate
    this.duration = duration
    if (name) {
      this.name = name
    }
  }
  response (type) {
    if (type === this.type) {
      return [this.val, this.rate]
    }
  }
  draw () {
    if (this.duration) {
      this.duration--
      if (this.duration <= 0) {
        removeFromArr(this.src.buff, this)
      }
    }
  }
}
export class buff_reAttack extends buff {
  constructor (vm, src, times) {
    super(vm, src)
    this.times = times
  }
  response (type) {
    if (['atk'].includes(type)) {
      // multi-reattack buff will be consumed
      let attackTime = 1/this.src.as*1000
      this.src.status.attack = 0.9 * attackTime
      this.times -= 1
      if (this.times == 0) {
        removeFromArr(this.src.buff, this)
      }
    }
  }
}

export class buff_graves_buckshot extends buff {
  constructor (vm, src) {
    super(vm, src)
    this.name = '大号铅弹'
  }
  response (type, ...args) {
    if (['atk'].includes(type)) {
      let len = (this.src.range+1)*2 *PosInfo.board.w1*PosInfo.board.ratio // if range 1, attack 2block(4w), if range 
      let [x1, y1] = this.vm.getCoord(...this.src.status.target.pos)
      let [x0, y0] = this.vm.getCoord(...this.src.pos)
      let midAngle = Math.atan((y1-y0)/(x1-x0))
      if (x1 < x0) {  // arctan only get -PI/2 ~ PI/2 (always right side)
        midAngle = Math.PI+midAngle
      }
      let angles = []
      for (let i=0; i < 6; i++) {
        angles.push(midAngle+(i-2.5)*Math.PI*2/30)
      }
      angles = angles.map(v => {
        return [len*Math.cos(v),len*Math.sin(v)]
      })
      new util_graves_buckshot(this.vm, this.src, angles)
    }
  }
}

export class buff_kassadin_netherblade extends buff {
  constructor (vm, src) {
    super(vm, src)
    this.name = '幽魂之刃'
    this.base = [25, 50, 75]
    this.val = this.base[src.lvl]
    this.shield_duration = 4*60
  }
  response (type, ...args) {
    if (['atk'].includes(type)) {
      let tgt_mp = this.src.status.target.mp_
      if (tgt_mp) {
        this.src.status.target.mp_ = tgt_mp > this.val ? tgt_mp - this.val : 0
        this.src.buff.push(new buff_shield(this.vm, this.src, this.val, this.shield_duration))
      }
    }
  }
}

export class buff_kennen_slicingmaelstrom extends buff {
  constructor (vm, src) {
    super(vm, src)
    this.name = '闪电风暴'
    this.base = [40, 80, 120]
    this.damage = this.base[src.lvl]
    this.type = 1
    this.now = 0
    this.interval = 0.5*60
    this.duration = 3 * 60
    this.stun = 1.5*60
    this.stun_type = 0
    this.been = []
    this.w = PosInfo.board.w1 * PosInfo.board.ratio * 5
    this.opacity = 100
  }
  draw (ctx) {
    if (this.now % this.interval == 0) {
      this.opacity = 100
      let grids = this.vm.board.grid
      for (let r in grids) {
        for (let c in grids[r]) {
          let tgt = grids[r][c]
          if (tgt != undefined && tgt.camp != this.src.camp && this.vm.getDistance(r, c, ...this.src.pos) <= 2) {
            this.vm.damage(this, tgt)
            if (this.been.findIndex(v=>v===tgt) < 0) {
              this.been.push(tgt)
              this.vm.stun(this, tgt)
            }
          }
        }
      }
    }
    this.now ++
    if (this.now == this.duration) {
      removeFromArr(this.src.buff, this)
    }
    this.opacity -= 2
    let coord = this.vm.getCoord(...this.src.pos)
    let x = coord[0]+this.vm.xbase, y = coord[1]+this.vm.ybase
    ctx.lineWidth = 20
    ctx.strokeStyle = `rgba(192, 255, 102, ${this.opacity/100})`
    ctx.beginPath()
    ctx.arc(x, y, this.w, 0, 2*Math.PI)
    ctx.stroke()
    ctx.lineWidth = 1
  }
}

export class buff_shield extends buff {
  constructor (vm, src, val, duration) {
    super(vm, src)
    this.val = val
    this.duration = duration
    this.now = 0
    this.type = 0 // 0 for all type daamge, 1 for spell damage only; this is backward-compatible
  }
  response (type, ...args) {
    if (type === 's_dmg') {
      let [damage, util] = args
      if (this.type === 1 && util.type !== 1) return
      if (damage < this.val) {
        this.val -= damage
        damage = 0
      } else {
        damage -= this.val
        removeFromArr(this.src.buff, this)
      }
      return damage
    }
  }
  draw () {
    this.now++
    if (this.now === this.duration) {
      removeFromArr(this.src.buff, this)
    }
  }
}

export class buff_vayne_silverbolts extends buff {
  constructor (vm, src) {
    super(vm, src)
  }
  response (type, args) {
    if (['atk'].includes(type)) {
      let buff = this.src.status.target.buff
      let flag = false
      for (let i in buff) {
        if (buff[i] instanceof buff_vayne_silverbolts_target) {
          flag=true
        }
      }
      if (!flag) {
        buff.push(new buff_vayne_silverbolts_target(this.vm, this.src, this.src.status.target))
      }
    }
  }
}
export class buff_vayne_silverbolts_target extends buff {
  constructor (vm, src, tgt) {
    super(vm, src)
    this.tgt = tgt
    this.rate_base = [0.08, 0.12, 0.16]
    this.rate = this.rate_base[src.lvl]
    this.stage = 0
    this.type = 2
  }
  response (type, args) {
    if (['dmg'].includes(type)) {
      this.stage ++
      if (this.stage === 3) {
        this.vm.damage(this, this.tgt)
        removeFromArr(this.tgt.buff, this)
      }
    }
  }
  get damage () {
    return this.tgt.hp * this.rate
  }
  set damage (dmg) {}
  draw (ctx, cenL, cenT) {
    ctx.lineWidth = 5
    ctx.strokeStyle = '#cccccc'
    let r = 6*(this.stage+1)
    ctx.beginPath()
    if (this.stage > 0) {
      ctx.arc(cenL, cenT, 50, 0, 2*Math.PI)
    }
    if (this.stage > 1) {
      ctx.arc(cenL, cenT, 65, 0, 2*Math.PI)
    }
    ctx.stroke()
    ctx.lineWidth = 1
  }
}


export class buff_garen_judgement extends buff {
  constructor (vm, src) {
    super(vm, src)
    this.base = [40, 65, 90]
    this.damage = this.base[src.lvl]
    this.type = 2
    this.now = 0
    this.w = 100
  }
  response () {
  }
  draw (ctx) {
    if (this.now % 30 === 0) {
      let six = this.vm.getSixPos(this.src.pos)
      for (let i in six) {
        let chess = this.vm.board.grid[six[i][0]][six[i][1]]
        if (chess && chess.camp !== this.src.camp) {
          this.vm.damage(this, chess)
        }
      }
    }
    if (this.now === 240) {
      removeFromArr(this.src.buff, this)
      this.src.status.spell = undefined
      this.src.status.attack = 0
    }
    let coord = this.vm.getCoord(...this.src.pos)
    let x = coord[0]+this.vm.xbase, y = coord[1]+this.vm.ybase
    let start = this.now/30*Math.PI*2
    ctx.lineWidth = 100
    ctx.strokeStyle = 'rgba(192, 255, 102, 0.7)'
    ctx.beginPath()
    ctx.arc(x, y, this.w, start, start+0.8*Math.PI)
    ctx.stroke()
    ctx.lineWidth = 1
    this.now ++
  }
}

export class buff_volibear_thunderclaws extends buff {
  constructor (vm, src) {
    super(vm, src)
    this.base_multiplier = [0.8, 0.9, 1]
    this.base_bounces = [3,4,5]
    this.bounces = this.base_bounces[src.lvl]
    this.type = 2
    this.now = 0
    this.post = 20
    this.w = 60
    this.duration = 20*60
  }
  get damage () {
    return this.src.ad*this.base_multiplier[this.src.lvl]
  }
  set damage (dmg) {}
  response(type) {
    if (type === 'atk') {
      let grids = this.vm.board.grid
      let poses = []
      for (let r in grids) {
        for (let c in grids[r]) {
          let chess = grids[r][c]
          if (chess && chess.camp != this.src.camp) {
            poses.push([r,c])
          }
        }
      }
      let tgts = []
      for (let i=0; i<this.bounces; i++) {
        if (poses.length === 0) break
        let tgtInd = randInt(poses.length)
        let tgtPos = poses.splice(tgtInd, 1)[0]
        tgts.push(tgtPos)
        this.vm.damage(this, grids[tgts[i][0]][tgts[i][1]])
      }
      this.tgts = tgts
      this.now = 0
    }
  }
  draw (ctx) {
    if (this.duration--===0) removeFromArr(this.src.buff, this)
    if (this.now < this.post) this.now++
    ctx.lineWidth = 10
    ctx.strokeStyle = `rgba(150,150,255,${1-this.now/this.post})`
    ctx.beginPath()
    ctx.moveTo(...this.vm.getBasedCoord(...this.src.pos))
    for (let i in this.tgts) {
      ctx.lineTo(...this.vm.getBasedCoord(...this.tgts[i]))
    }
    ctx.lineTo(...this.vm.getBasedCoord(...this.src.pos))
    ctx.stroke()
    ctx.lineWidth = 1
  }
}

export class buff_gnar_gnaaaaar extends buff {
  constructor (vm, src, orient) {
    super(vm, src)
    this.orient = orient
    this.damage_base = [200, 300, 400]
    this.damage = this.damage_base[this.src.lvl]
    this.type = 1
    this.stun = 2 * 60
    this.stun_type = 0
    this.done = false
  }
  response (type) {
    if (type === 'gnaaaaar_act') {
      this.done = true
      let orient = this.orient
      let grids = this.vm.board.grid
      let threeOrients = [orient, (orient+6-1) % 6, (orient+6+1) % 6]
      let d = [[], []]
      for (let i in threeOrients) {
        d[0].push(this.vm.getOrientGrid(this.src.pos, threeOrients[i]))
      }
      for (let i in threeOrients) {
        d[1].push(this.vm.getOrientGrid(d[0][0], threeOrients[i]))
      }
      for (let i = 1; i>=0; i--) {
        for (let j = 0; j<3; j++) {
          let pos = d[i][j]
          let chess = grids[pos[0]][pos[1]]
          if (chess && chess.camp !== this.src.camp) {
            let p1 = this.vm.getOrientGrid(pos, orient)
            for (let k in threeOrients) {
              let tgt = this.vm.getOrientGrid(p1, threeOrients[k])
              if (tgt && grids[tgt[0]][tgt[1]] === undefined) {
                this.vm.moveChessOnce(chess, tgt)
                break
              }
            }
            if (grids[pos[0]][pos[1]]) {
              if (grids[p1[0]][p1[1]] === undefined) {
                this.vm.moveChessOnce(chess, p1)
              }
            }
            this.vm.damage(this, chess)
            this.vm.stun(this, chess)
          }
        }
      }
      removeFromArr(this.src.buff, this)
    }
  }
  draw () {
    if (!this.src.status.jump && !this.done) {
      this.response('gnaaaaar_act')
    }
  }
}

export class buff_nidalee_heal extends buff {
  constructor (vm, src) {
    super(vm, src)
    this.ticks = 6*60
    this.val_base = [150, 375, 600]
    this.val = this.val_base[this.src.lvl]/this.ticks
    this.now = 0
    this.name = 'Nidalee_healing'
  }
  response (type) {
  }
  draw () {
    this.now ++
    if (this.now >= this.ticks) removeFromArr(this.src.buff, this)
    this.vm.heal(this, this.src)
  }
}

export class buff_class_gun extends buff {
  constructor (vm, src, stage) {
    super(vm, src)
    this.base = [1, 2, 3]
    this.extra = this.base[stage]
    this.name = '枪手'
  }
  response(type, ...args) {
    if (['atk'].includes(type)) {
      let trigger = randInt(2)
      if (trigger) {
        let grids = this.vm.board.grid
        let avails = []
        for (let r in grids) {
          for (let c in grids[r]) {
            if (grids[r][c] && grids[r][c].camp !== this.src.camp
            && this.vm.getDistance(r, c, ...this.src.pos) < this.src.range  // in range
            && grids[r][c] !== this.src.status.tgt) {                       // not current tgt
              avails.push([r,c])
            }
          }
        }
        if (this.src.id === 1) {
          console.log(avails)
        }
        if (avails.length === 0) return
        else if (avails.length > this.extra) {
          do {
            avails.splice(randInt(avails.length), 1)
          } while (avails.length > this.extra)
        }
        if (this.src.id === 1) {
          console.log(avails)
        }
        for (let i in avails) {
          this.vm.createUtilAttack(this.src, grids[avails[i][0]][avails[i][1]])
        }
      }
    }
  }
}

export class buff_class_void extends buff {
  constructor (vm, src) {
    super(vm, src)
    this.name = '虚空'
  }
  response(type) {
    if (['util_type'].includes(type)) {
      return 2
    }
  }
}

export class buff_class_noble extends buff {
  constructor (vm, src) {
    super(vm, src)
    this.name = '贵族'
    this.val = 30
  }
  response(type, ...args) {
    if (['atk'].includes(type)) {
      this.vm.heal(this, this.src)
    }
  }
}

export class buff_class_ranger extends buff_val {
  constructor (vm, src) {
    super (vm, src, 'as', 0, 1, name='游侠')
    this.base = [0.25, 0.7]
    this.chance = this.base[src.lvl]
    this.now = 0
    this.tick = 3 *60
    this.w = 40
    this.len = 0.8*Math.PI
    this.start = 0
    this.deg = 1/360*2*Math.PI
    this.sp = [1,2,4,8,16,32]
  }
  draw (ctx) {
    this.now ++
    if (this.now == this.tick) {
      if (randInt(100)<this.chance*100) {
        this.val = 1
      } else {
        this.val = 0
      }
      this.now = 0
    }
    if (this.val == 0) return
    let [x, y] = this.vm.getCoord(...this.src.pos)
    x += this.vm.xbase
    y += this.vm.ybase
    this.start += this.deg*this.sp[Math.floor(this.now/30)]
    let start0 = this.start
    let start1 = this.start+Math.PI
    ctx.strokeStyle = 'rgba(193,241,15,0.9)'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(x, y, 30, start0, start0+this.len)
    ctx.arc(x, y, 30, start1, start1+this.len)
    ctx.stroke()
    ctx.lineWidth = 1
  }
}

export class buff_darius_decimate extends buff {
  constructor (vm, src) {
    super(vm, src)
    this.base = [150, 200, 250]
    this.heal_base = [100, 150, 200]
    this.damage = this.base[src.lvl]
    this.type = 1
    this.now = 0
    this.w = 100
    this.status = 0
    this.p1 = 60
    this.p2 = 30
  }
  response () {
  }
  draw (ctx) {
    if (this.now % p0 === 0) {
      let six = this.vm.getSixPos(this.src.pos)
      let n = 0
      for (let i in six) {
        let chess = this.vm.board.grid[six[i][0]][six[i][1]]
        if (chess && chess.camp !== this.src.camp) {
          this.vm.damage(this, chess)
          n++
        }
      }
      this.val = n * this.heal_base[this.src.lvl]
      this.vm.heal(this, this.src)
      this.status = 1
      this.now = 0
    }
    if (this.now == p1 && this.status == 1) {
      removeFromArr(this.src.buff, this)
      this.src.status.spell = undefined
      this.src.status.attack = 0
    }
    let opacity = 0
    if (this.status == 0) {
      opacity = this.now / p0 * 0.2+0.2
    } else {
      opacity = this.now / p1 * -1+1
    }
    let x, y = this.vm.getBasedCoord(...this.src.pos)
    ctx.lineWidth = 100
    ctx.strokeStyle = `rgba(50, 50, 50, ${opacity}`
    ctx.beginPath()
    ctx.arc(x, y, 140, 0, Math.PI*2)
    ctx.stroke()
    ctx.lineWidth = 1
    this.now ++
  }
}


export class buff_shyvana_dragondescent extends buff {
  constructor (vm, src) {
    super(vm, src)
  }
  response (type, args) {
    if (['atk'].includes(type)) {
      this.src.status.target.buff.push(new buff_shyvana_dragondescent_target(this.vm, this.src, this.src.status.target))
    }
  }
}
export class buff_shyvana_dragondescent_target extends buff {
  constructor (vm, src, tgt) {
    super(vm, src)
    this.duration = 3*60
    this.damage = [200, 300, 400][this.src.lvl] / (3*60)
    this.tgt = tgt
    this.type = 1
  }
  response (type, args) {
  }
  draw (ctx, cenL, cenT) {
    this.now ++
    this.vm.damage(this, this.tgt)
  }
}

export class buff_braum_unbreakable extends buff {
  constructor (vm, src) {
    super(vm, src)
    this.reduction = [0.7, 0.8, 0.9][this.src.lvl]
    this.now = 0
    this.duration = 4*60
    let orient = this.vm.getApproxOrient(...this.src.status.target.pos, ...this.src.pos)
    if (orient == undefined) console.log(`Error: Braum spell undefined orient, target ${this.src.status.target.pos}`)
    this.start = ((2 - orient)*2-1) * Math.PI/6
    this.end = this.start + Math.PI / 3
  }
  response (type, damage, util) {
    if (['r_dmg'].includes(type)) {
      if (util.type == 0 || util.type == 1) {
        return damage * this.reduction
      }
    }
  }
  draw (ctx) {
    let x, y = this.vm.getBasedCoord(this.src.pos)
    ctx.lineWidth = 20
    ctx.strokeStyle = 'rgba(33, 200, 200, 0.7)'
    ctx.arc(x, y, 80, this.start, this.end)
    ctx.lineWidth = 1
    if (this.now == this.duration) {
      removeFromArr(this.src.buff, this)
    }
    this.now ++
  }
}

export class buff_morgana_soulshackles extends buff {
  constructor (vm, src, tgt) {
    super(vm, src)
    this.tgt = tgt
    this.stun = [2, 4, 6][this.src.lvl]*this.src.lvl
    this.stun_type = 1
    this.now = 0
    this.duration = 3*60
  }
  draw (ctx) {
    if (this.now == this.duration) {
      this.vm.stun(this, this.tgt)
      removeFromArr(this.tgt.buff, this)
    }
    if (this.now % 10 === 0) {
      if (this.vm.getDistance(...this.tgt.pos, ...this.src.pos) > 3) {
        removeFromArr(this.tgt.buff, this)
      }
    }
    let x1, y1 = this.vm.getBasedCoord(this.src.pos)
    let x2, y2 = this.vm.getBasedCoord(this.tgt.pos)
    ctx.lineWidth = 10
    ctx.strokeStyle = 'rgba(99, 49, 200, 0.8)'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.lineWidth = 1
    this.now ++
  }
}

export class buff_gangplank_keg extends buff {
  constructor (vm, src) {
    super(vm, src)
    this.kegs = []
    this.atk = 0
  }
  response (type) {
    if (['atk'].includes(type)) {
      this.atk++
      if (this.atk == 2) {
        this.atk == 0
        let grids = this.vm.board.grid
        let tgts = []
        for (let r in grids) {
          for (let c in grids[r]) {
            let tgt = grids[r][c]
            if (tgt != undefined && tgt.camp != this.camp) {
              tgts.push({hp:tgt.hp, pos: [r,c]})
            }
          }
        }
      }
      tgts = tgts.sort((a,b) => a.hp-b.hp)
      let idx = this.kegs.length % tgts.length
      this.kegs.push(new util_gangplank_keg(this.vm, this.src, tgts[this.kegs.length].pos))
    }
    else if (['detonate'].includes(type)) {
      for (let i in this.kegs) {
        this.kegs[i].effect()
      }
      this.kegs = []
    }
  }
}


export class chess {
  constructor (vm) {
    this.vm = vm
    this._crit_fold = 2
  }
  die () {
    // remove chess from board
    let grid = this.vm.board.grid
    grid[this.pos[0]][this.pos[1]] = undefined
    // set chess status as dead, so other chess and util will remove it.
    for (let i in this.status) {
      this.status[i] = undefined
    }
    this.status.dead = true
  }
  equip (e) {
    if (this.equips.length < 3) {
      this.equips.push(e)
      e.equipTo(this)
      return true
    } else {
      this.vm.dealError('Full Equipments :)')
    }
  }
  unequip (index) {
    this.equips[index].unequipFrom()
    this.equips.splice(index, 1)
  }
  __checkBuff (raw, type) {
    let rate = 1
    let bonus = 0
    for (let i in this.buff) {
      let res = this.buff[i].response(type)
      if (res) {
        if (res[1]) {
          rate += res[0]
        } else {
          bonus += res[0]
        }
      }
    }
    return (raw + bonus) * rate
  }
  get name () {
    return this._name
  }
  set name (name) {
    this._name = name
  }
  get ad () {
    return this.__checkBuff(this._ad, 'ad')
  }
  set ad (ad) {
    this._ad = ad
  }
  get hp () {
    let h_p = this.__checkBuff(this._hp, 'hp')
    if (this.hp_ > h_p) this.hp_ = h_p
    return h_p
  }
  set hp (hp) {
    this._hp = hp
  }
  get as () {
    return this.__checkBuff(this._as, 'as')
  }
  set as (as) {
    this._as = as
  }
  get range () {
    return this.__checkBuff(this._range, 'range')
  }
  set range (range) {
    this._range = range
  }
  get crit () {
    return this.__checkBuff(this._crit, 'crit')
  }
  set crit (crit) {
    this._crit = crit
  }
  get crit_fold () {
    return this.__checkBuff(this._crit_fold, 'crit_fold')
  }
  set crit_fold (crit_fold) {
    this._crit_fold = crit_fold
  }
  get mp_init () {
    if (!this._mp_init) return undefined
    return this.__checkBuff(this._mp_init, 'mp_init')
  }
  set mp_init (mp_init) {
    this._mp_init = mp_init
  }
  getShield () {
    let shield = 0
    for (let i in this.buff) {
      if (this.buff[i] instanceof buff_shield) {
        shield += this.buff[i].val
      }
    }
    return shield
  }
  get dodge () {
    let p = this.__checkBuff(this._dodge, 'dodge')
    return Math.min(1, p)
  }
  set dodge (dodge) {
    this._dodge = dodge
  }
}

// chess class definitions:

export default [
  class Tristana extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 0,
      this._name = '麦林炮手',
      this.src = 'Tristana.png',
      this.cat = [0, 1],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [500, 900, 1800]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 50,
      this._as = 0.65,
      this.sp = 75,
      this._range = 4,
      this._crit = 0.25,
      this.armor = 20,
      this.mr = 20,
      this.util = {
        sp: 800,
        bomb_sp: 600,
        bomb_sz: 6
      },
      this.buff = [
      ],
      this.spell_pre = 10
      this.spell = function explosiveSpark () {
        if (this.status.target) {
          new util_tristana_bomb(this.vm, this, this.status.target)
        }
        this.status.spell = undefined
        this.status.attack = 0
      }
    }
  },

  class Lucian extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 1,
      this._name = '圣枪游侠',
      this.src = 'Lucian.png',
      this.cat = [0, 2],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [600, 1080, 2160]
      this.ad_base = [65, 117, 234]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 35,
      this._as = 0.65,
      this.range = 3,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.util = {
        sp: 1000,
        spell_sp: 20,
        sz: 10,
      },
      this.buff = [
      ]
      this.spell_pre = 0
      this.spell = function relentless_pursuit () {
        if (this.status.target) {
          let grid = this.vm.board.grid
          let avails = []
          for (let r in grid) {
            for (let c in grid[r]) {
              if (grid[r][c] === undefined && this.vm.getDistance(r,c, ...this.pos) <= 2 && this.vm.getDistance(r,c,...this.status.target.pos) <= this.range) {
                avails.push([r,c])
              }
            }
          }
          if (avails.length) {
            this.status.attack = undefined
            this.status.spell = undefined
            this.status.jump = {p:0, pn:this.util.spell_sp, src: this.pos, tgt: avails[randInt(avails.length)]}
            this.buff.push(new buff_lucian_nextAttackWith(this.vm, this, this.status.target))
          }
        }
      }
    }
  },

  class Yasuo extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 2,
      this._name = '疾风剑豪',
      this.src = 'Yasuo.png',
      this.cat = [3, 4],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [750, 1350, 2700]
      this.ad_base = [75, 135, 270]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 25,
      this._as = 1,
      this.range = 1,
      this.sp = 60,
      this.armor = 35,
      this.mr = 20,
      this._crit = 0.25,
      this.util = {
        sp: 1000,
      },
      this.buff = [
      ]
      this.spell_pre = 30
      this.spell_stage = 0
      this.spell = function steel_tempest () {
        if (this.status.target) {
          let [x0,y0] = this.vm.getCoord(...this.pos)
          let [x1,y1] = this.vm.getCoord(...this.status.target.pos)
          let tgtLen = this.vm.getEuclid(x0, y0, x1, y1)
          let info = PosInfo.board
          if (this.spell_stage < 2) {
            let len = info.w1*info.ratio*4
            let xt = len/tgtLen*(x1-x0)+x0
            let yt = len/tgtLen*(y1-y0)+y0
            new util_yasuo_tempest(this.vm, this, [x0,y0], [xt,yt])
            this.spell_stage ++
          } else {
            let len = info.w1*info.ratio*10
            let x_len = (x1-x0)/tgtLen*len
            let y_len = (y1-y0)/tgtLen*len
            new util_yasuo_tornado(this.vm, this, x_len, y_len)
            this.spell_stage = 0
          }
          this.status.spell = undefined
          this.status.attack = 0
        }
      }
    }
  },

  class Graves extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 3,
      this._name = '法外狂徒',
      this.src = 'Graves.png',
      this.cat = [0, 5],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [450, 810, 1620]
      this.ad_base = [55, 99, 198]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 0,
      this._as = 0.55,
      this.range = 1,
      this.sp = 60,
      this.armor = 30,
      this.mr = 20,
      this._crit = 0.25,
      this.util = {
        sp: 1000,
      },
      this.buff = [
        new buff_graves_buckshot(this.vm, this)
      ]
    }
  },

  class Aatrox extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 4,
      this._name = '暗裔剑魔',
      this.src = 'Aatrox.png',
      this.cat = [3, 6],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [450, 810, 1620]
      this.ad_base = [55, 99, 198]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 75,
      this._as = 0.65,
      this.range = 1,
      this.sp = 60,
      this.armor = 25,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      },
      this.spell_pre = 60
      this.spell = function the_darkin_blade () {
        if (this.status.target) {
          new util_aatrox_blade(this.vm, this, this.status.target.pos)
          this.status.spell = undefined
          this.status.attack = 0
        }
      }
    }
  },

  class Chogath extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 5,
      this._name = '虚空恐惧',
      this.src = 'Chogath.png',
      this.cat = [7, 8],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [1000, 1800, 3600]
      this.ad_base = [70, 126, 252]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 150,
      this._mp_init = 50
      this._as = 0.6,
      this.range = 1,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      },
      this.spell_pre = 30
      this.spell = function the_darkin_blade () {
        if (this.status.target) {
          new util_chogath_rupture(this.vm, this, this.status.target.pos)
          this.status.spell = undefined
          this.status.attack = 0
        }
      }
    }
  },

  class Kassadin extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 6,
      this._name = '虚空行者',
      this.src = 'Kassadin.png',
      this.cat = [7, 9],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [550, 990, 1980]
      this.ad_base = [40, 72, 144]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this._as = 0.55,
      this.range = 1,
      this.sp = 60,
      this.armor = 35,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
        new buff_kassadin_netherblade(this.vm, this)
      ]
      this.util = {
        sp: 1000,
      }
    }
  },

  class Vayne extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 7,
      this._name = '暗夜猎手',
      this.src = 'Vayne.png',
      this.cat = [2, 10],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [550, 990, 1980]
      this.ad_base = [40, 72, 144]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this._as = 0.7,
      this.range = 3,
      this.sp = 60,
      this.armor = 25,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
        new buff_vayne_silverbolts(this.vm, this)
      ]
      this.util = {
        sp: 1000,
      }
    }
  },

  class Varus extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 8,
      this._name = '惩戒之箭',
      this.src = 'Varus.png',
      this.cat = [6, 10],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [500, 900, 1800]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 75,
      this._as = 0.7,
      this.range = 4,
      this.sp = 60,
      this.armor = 25,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 90
      this.spell = function piercing_arrow () {
        if (this.status.target) {
          new util_varus_arrow(this.vm, this)
          this.status.spell = undefined
          this.status.attack = 0
        }
      }
    }
  },

  class Ashe extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 9,
      this._name = '寒冰射手',
      this.src = 'Ashe.png',
      this.cat = [10, 11],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [550, 990, 1980]
      this.ad_base = [65, 117, 234]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 125,
      this._as = 0.7,
      this.range = 4,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 20
      this.spell = function enchanted_crystal_arrow () {
        if (this.status.target) {
          let grids = this.vm.board.grid
          let maxPos = undefined
          let maxDis = 0
          for (let r in grids) {
            for (let c in grids[r]) {
              if (grids[r][c] && grids[r][c].camp !== this.src.camp) {
                let dis = this.vm.getDistance(...this.pos, r, c)
                if (dis > maxDis) {
                  maxDis = dis
                  maxPos = [r, c]
                }
              }
            }
          }
          if (maxPos) {
            new util_ashe_arrow(this.vm, this, maxPos)
          }
          this.status.spell = undefined
          this.status.attack = 0
        }
      }
    }
  },

  class Garen extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 10,
      this._name = '德玛西亚之力',
      this.src = 'Garen.png',
      this.cat = [2, 12],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [600, 1080, 2160]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 100,
      this._as = 0.6,
      this.range = 1,
      this.sp = 60,
      this.armor = 40,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 1
      this.spell = function judgement () {
        this.buff.push(new buff_garen_judgement(this.vm, this))
      }
    }
  },

  class Volibear extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 11,
      this._name = '雷霆咆哮',
      this.src = 'Volibear.png',
      this.cat = [8, 11],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [750, 1350, 2700]
      this.ad_base = [70, 126, 252]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 75,
      this._as = 0.6,
      this.range = 1,
      this.sp = 60,
      this.armor = 30,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 1
      this.spell = function judgement () {
        this.buff.push(new buff_volibear_thunderclaws(this.vm, this))
        this.status.spell = undefined
        this.status.attack = 0
      }
    }
  },

  class Mordekaiser extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 12,
      this._name = '铁铠冥魂',
      this.src = 'Mordekaiser.png',
      this.cat = [12, 13],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [550, 990, 1980]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 70,
      this._mp_init = 50
      this._as = 0.5,
      this.range = 1,
      this.sp = 60,
      this.armor = 40,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 30
      this.spell = function obliterate () {
        new util_mordekaiser_obliterate(this.vm, this)
        this.status.spell = undefined
        this.status.attack = 0
      }
    }
  },

  class Gnar extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 13,
      this._name = '迷失之牙',
      this.src = 'Gnar.png',
      this.cat = [1, 14, 15],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [700, 1260, 2520]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 100,
      this._as = 0.7,
      this.range = 2,
      this.sp = 60,
      this.armor = 30,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        spell_sp: 20,
      }
      this.bonus_hp_base = [250, 450, 650]
      this.bonus_hp = this.bonus_hp_base[this.lvl]
      this.bonus_damage_base = [50, 100, 150]
      this.bonus_damage = this.bonus_damage_base[this.lvl]
      this.spell_pre = 1
      this.spell = function gnaaaaar () {
        this.mp = undefined
        this.range = 1
        this.buff.push(new buff_val(this.vm, this, 'hp', this.bonus_hp, 0, '变形—血量'))
        this.status.attack = undefined
        this.status.spell = undefined
        let grids = this.vm.board.grid
        let d = 0
        let pos = undefined
        for (let r in grids) {
          for (let c in grids[r]) {
            if (grids[r][c] && grids[r][c].camp !== this.camp) {
              let d_ = this.vm.getDistance(...this.pos, r, c)
              if (d_ > d) {
                d = d_
                pos = [r,c]
              }
            }
          }
        }
        if (pos) {
          let res = this.vm.getFurthestGrid(...pos)
          if (res) {
            this.status.jump = {p:0, pn:this.util.spell_sp, src: this.pos, tgt: res[0]}
            this.buff.push(new buff_gnar_gnaaaaar(this.vm, this, res[1]))
          }
        }
      }
    }
  },

  class Ahri extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 14,
      this._name = '九尾妖狐',
      this.src = 'Ahri.png',
      this.cat = [9, 14],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [450, 810, 1620]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 25,
      this._as = 0.55,
      this.range = 3,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        spell_sp: 20,
      }
      this.spell_pre = 1
      this.spell = function orb_of_deception () {
        new util_ahri_orb(this.vm, this)
        this.status.spell = undefined
        this.status.attack = 0
      }
    }
  },

  class Khazix extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 15,
      this._name = '虚空掠夺者',
      this.src = 'Khazix.png',
      this.cat = [7, 16],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [500, 900, 1800]
      this.ad_base = [55, 99, 198]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 65,
      this._as = 0.6,
      this.range = 1,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        spell_sp: 20,
      }
      this.spell_pre = 1
      this.spell = function test_their_fear () {
        if (this.status.target) {
          new util_khazix_tastetheirfear(this.vm, this, this.status.target)
        }
        this.status.spell = undefined
        this.status.attack = 0
      }
    }
  },

  class Lulu extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 16,
      this._name = '仙灵女巫',
      this.src = 'Lulu.png',
      this.cat = [1, 9],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [500, 900, 1800]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 150,
      this._as = 0.65,
      this.range = 3,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        hp_base: [300, 400, 500]
      }
      this.val = this.util.hp_base[this.lvl]
      this.type = 1
      this.stun = 2 * 60
      this.stun_type = 0
      this.spell_pre = 1
      this.spell = function wild_growth () {
        let grids = this.vm.board.grid
        let minPos = undefined
        let min = 100000
        for (let r in grids) {
          for (let c in grids[r]) {
            let chess = grids[r][c]
            if (chess && chess.camp==this.camp && chess.hp_<min) {
              minPos = [r,c]
              min = chess.hp_
            }
          }
        }
        if (minPos) {
          let tgt = grids[minPos[0]][minPos[1]]
          this.buff.push(new buff_val(this.vm, this, 'hp', this.util.hp_base[this.lvl], 0, '狂野生长_血量', 6*60))
          this.vm.heal(this, tgt)
          let six = this.vm.getSixPos(minPos)
          for (let i in six) {
            let chess = grids[six[i][0]][six[i][1]]
            if (chess && chess.camp != this.camp) {
              this.vm.stun(this, chess)
            }
          }
        }
        this.status.spell = undefined
        this.status.attack = 0
      }
    }
  },

  class Nidalee extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 17,
      this._name = '狂野女猎手',
      this.src = 'Nidalee.png',
      this.cat = [14, 15],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [500, 900, 1800]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 85,
      this._as = 0.6,
      this.range = 2,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        damage_base: [20, 70, 120]
      }
      this.spell_pre = 30
      this.spell = function wild_growth () {
        let grids = this.vm.board.grid
        let minChess = undefined
        let min = 100000
        for (let r in grids) {
          for (let c in grids[r]) {
            let chess = grids[r][c]
            if (chess && chess.camp==this.camp && chess !== this && chess.hp_<min) {
              minChess = chess
              min = chess.hp_
            }
          }
        }
        this.range = 1
        this.mp = undefined
        this.buff.push(new buff_val(this.vm, this, 'ad', this.util.damage_base[this.lvl], 0))
        this.buff.push(new buff_nidalee_heal(this.vm, this))
        console.log(minChess)
        if (minChess) {
          minChess.buff.push(new buff_nidalee_heal(this.vm, minChess))
        }
        this.status.spell = undefined
        this.status.attack = 0
      }
    }
  },

  class Kaisa extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 18,
      this._name = '虚空之女',
      this.src = 'Kaisa.png',
      this.cat = [7, 10, 16],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [700, 1260, 2520]
      this.ad_base = [55, 99, 198]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 125,
      this._mp_init = 50,
      this._as = 1.25,
      this.range = 2,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        spell_sp: 20,
        spell_as_base: [0.5, 0.75, 1],
        spell_shield_base: [400, 700, 1000]
      }
      this.spell_pre = 1
      this.spell = function killer_instinct () {
        let grids = this.vm.board.grid
        let d = 0
        let pos = undefined
        for (let r in grids) {
          for (let c in grids[r]) {
            if (grids[r][c] && grids[r][c].camp !== this.camp) {
              let d_ = this.vm.getDistance(...this.pos, r, c)
              if (d_ > d) {
                d = d_
                pos = [r,c]
              }
            }
          }
        }
        if (pos) {
          let res = this.vm.getFurthestGrid(...pos)
          if (res) {
            this.status.jump = {p:0, pn:this.util.spell_sp, src: this.pos, tgt: res[0]}
            this.buff.push(new buff_val(this.vm, this, 'as', 0, this.util.spell_as_base[this.lvl], '猎手本能', 3*60))
            this.buff.push(new buff_shield(this.vm, this, this.util.spell_shield_base[this.lvl], 3*60))
          }
        }
        this.status.spell = undefined
        this.status.attack = undefined
      }
    }
  },

  class Kennen extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 19,
      this._name = '狂暴之心',
      this.src = 'Kennen.png',
      this.cat = [1, 17, 18],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [550, 990, 1980]
      this.ad_base = [65, 117, 234]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 80,
      this._mp_init = 50,
      this._as = 0.65,
      this.range = 2,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 30
      this.spell = function slicing_maelstrom () {
        this.buff.push(new buff_kennen_slicingmaelstrom(this.vm, this))
        this.status.spell = undefined
        this.status.attack = 0
      }
    }
  },

  class Shen extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 20,
      this._name = '暮光之眼',
      this.src = 'Shen.png',
      this.cat = [3, 17],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [700, 1260, 2520]
      this.ad_base = [65, 117, 234]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 150,
      this._mp_init = 100,
      this._as = 0.7,
      this.range = 1,
      this.sp = 60,
      this.armor = 30,
      this.mr = 20,
      this._crit = 0.25,
      this._dodge = 0
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 30
      this.spell = function spirits_refuge () {
        new util_shen_spirits_refuge(this.vm, this.src, this.tgt, this.base[this.src.lvl])
        this.status.spell = undefined
        this.status.attack = 0
      }
    }
  },

  class Warwick extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 21,
      this._name = '祖安怒兽',
      this.src = 'Warwick.png',
      this.cat = [8, 14],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [650, 1170, 2340]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 150,
      this._mp_init = 50,
      this._as = 0.6,
      this.range = 1,
      this.sp = 60,
      this.armor = 30,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        spell_sp: 20,
        stun: 1.5 * 60,
        stun_type: 0,
      }
      this.spell_pre = 10
      this.spell = function spirits_refuge () {
        let grids = this.vm.board.grid
        let minTgt = undefined
        let minHp = 1000000
        for (let r in grids) {
          for (let c in grids[r]) {
            let tgt = grids[r][c]
            if (tgt != undefined && tgt.camp != this.camp && tgt.hp_ < minHp) {
              minHp = tgt.hp_
              minTgt = tgt
            }
          }
        }
        if (minTgt) {
          let avails = this.vm.getSixPos(minTgt)
          if (avails) {
            let tgt = avails[randInt(avails.length)]
            this.status.attack = undefined
            this.status.spell = undefined
            this.status.jump = {p:0, pn:this.util.spell_sp, src: this.pos, tgt: tgt}
            this.vm.stun(this.util, tgt)
            this.buff.push(new buff_reAttack(this.vm, this, 3))
          }
        }
      }
    }
  },

  class Darius extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 22,
      this._name = '诺克萨斯之手',
      this.src = 'Darius.png',
      this.cat = [12, 19],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [600, 1080, 2160]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 100,
      this._as = 0.5,
      this.range = 1,
      this.sp = 60,
      this.armor = 40,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 1
      this.spell = function spirits_refuge () {
        this.buff.push(new buff_garen_judgement(this.vm, this))
      }
    }
  },

  class Draven extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 23,
      this._name = '荣耀行刑官',
      this.src = 'Draven.png',
      this.cat = [3, 19],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [650, 1170, 2340]
      this.ad_base = [65, 117, 234]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 50,
      this._as = 0.75,
      this.range = 3,
      this.sp = 60,
      this.armor = 25,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        damage_base: [1.5, 2, 2.5],
        as_base: [0.3, 0.45, 0.6]
      }
      this.spell_pre = 0
      this.stage = 0
      this.spell = function spinning_axes () {
        this.stage ++
        this.buff.push(new buff_val(this.vm, this, 'ad', 0, this.util.damage_base[this.lvl]))
        this.buff.push(new buff_val(this.vm, this, 'as', 0, this.util.as_base[this.lvl]))
        if (this.stage == 2) {
          this.spell = undefined
          this.mp = undefined
          this.attack = 0
        }
      }
    }
  },

  class Shyvana extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 24,
      this._name = '龙血武姬',
      this.src = 'Shyvana.png',
      this.cat = [15, 20],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [650, 1170, 2340]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 85,
      this._as = 0.7,
      this.range = 1,
      this.sp = 60,
      this.armor = 30,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        spell_sp: 20,
        bonus_ad_base: [100, 150, 200],
      }
      this.spell_pre = 0
      this.spell = function dragondescent () {
        this.mp = undefined
        this.range = 3
        this.buff.push(new buff_val(this.vm, this, 'ad', this.util.bonus_ad_base[this.lvl]))
        this.buff.push(new buff_shyvana_dragondescent(this.vm, this))
        if (this.status.target) {
          let grids = this.vm.board.grid
          let orient = getApproxOrient(...this.status.target.pos, ...this.pos)
          let dis = this.vm.getDistance(...this.pos, ...this.status.target.pos)
          let current = this.pos
          for (let i = 0; i < this.range - dis; i++) {
            let tgt = this.vm.getOrientGrid(this.pos, current)
            if (tgt && grids[tgt[0]][tgt[1]] == undefined) {
              current = tgt
            } else {
              break
            }
          }
          if (current) {
            this.status.jump = {p:0, pn:this.util.spell_sp, src: this.pos, tgt: current}
          }
        }
        else {
          console.log('Shyvana_spellNoTarget')
        }
      }
    }
  },
  
  class Veigar extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 25,
      this._name = '邪恶小法师',
      this.src = 'Veigar.png',
      this.cat = [1, 9],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [500, 900, 1800]
      this.ad_base = [45, 81, 162]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 75,
      this._as = 0.55,
      this.range = 3,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        spell_sp: 20,
      }
      this.spell_pre = 15
      this.spell = function primordial_burst () {
        if (this.status.target) {
          new util_veigar_primordial_burst(this.vm, this, this.status.target)
          this.status.spell = undefined
          this.status.attack = 0
        } else {
          console.log('Veigar_spellNoTarget')
        }
      }
    }
  },

  class Karthus extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 26,
      this._name = '死亡颂唱者',
      this.src = 'Karthus.png',
      this.cat = [9, 13],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [850, 1530, 3060]
      this.ad_base = [65, 117, 234]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 125,
      this._mp_init = 40,
      this._as = 0.65,
      this.range = 3,
      this.sp = 60,
      this.armor = 25,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        n_tgt: [5, 7, 9][this.lvl]
      }
      this.spell_pre = 0
      this.spell_post = 150
      this.spell = function requiem () {
        new util_karthus_requiem(this.vm, this, tgt)
      }
    }
  },

  class Braum extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 27,
      this._name = '弗雷尔卓德之心',
      this.src = 'Braum.png',
      this.cat = [11, 21],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [650, 1170, 2340]
      this.ad_base = [40, 72, 144]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 75,
      this._as = 0.6,
      this.range = 1,
      this.sp = 60,
      this.armor = 75,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 0
      this.spell = function unbreakable () {
        this.buff.push(new buff_braum_unbreakable(this.vm, this))
      }
    }
  },

  class Brand extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 28,
      this._name = '复仇焰魂',
      this.src = 'Brand.png',
      this.cat = [6, 18],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [700, 1260, 2520]
      this.ad_base = [60, 108, 216]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 150,
      this._mp_init = 50
      this._as = 0.6,
      this.range = 3,
      this.sp = 60,
      this.armor = 25,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 15
      this.spell = function pyroclasm () {
        new util_brand_pyroclasm(this.vm, this, this.status.target)
      }
    }
  },

  class Poppy extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 29,
      this._name = '圣锤之毅',
      this.src = 'Poppy.png',
      this.cat = [1, 12],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [700, 1260, 2520]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 75,
      this._mp_init = 50
      this._as = 0.5,
      this.range = 1,
      this.sp = 60,
      this.armor = 40,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        damage: [300, 500, 700][this.lvl],
        type: 1,
        stun: [2,3,4][this.lvl]*60,
        stun_type: 0
      }
      this.spell_pre = 45
      this.spell = function pyroclasm () {
        let grids = this.vm.board.grid
        let avails = []
        for (let r in grids) {
          for (let c in grids[r]) {
            let tgt = grids[r][c]
            if (tgt && tgt.camp != this.camp) {
              avails.push({p:[r,c], d:this.vm.getDistance(r, c, ...this.pos)})
            }
          }
        }
        let sortedAvails = avails.sort((a,b) => a.d-b.d)
        let selectedAvails = sortedAvails.splice(0, 3)
        for (let i in selectedAvails) {
          let pos = selectedAvails.p
          let tgt = grids[pos[0]][pos[1]]
          this.vm.stun(this.util, tgt)
          this.vm.damage(this.util, tgt)
        }
      }
    }
  },

  class Morgana extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 30,
      this._name = '堕落天使',
      this.src = 'Morgana.png',
      this.cat = [6, 9],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [650, 1170, 2340]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp = this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 150,
      this._mp_init = 50
      this._as = 0.6,
      this.range = 2,
      this.sp = 60,
      this.armor = 30,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        damage: [300, 500, 700][this.lvl],
        type: 1,
      }
      this.spell_pre = 15
      this.spell = function pyroclasm () {
        let grids = this.vm.board.grid
        for (let r in grids) {
          for (let c in grids[r]) {
            let tgt = grids[r][c]
            if (tgt && tgt.camp != this.camp && this.vm.getDistance(r, c, ...this.pos) <= 3) {
              this.vm.damage(this.util, tgt)
              tgt.buff.push()
            }
          }
        }
      }
    }
  },

  class Rengar extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 31,
      this._name = '傲之追猎者',
      this.src = 'Rengar.png',
      this.cat = [14, 16],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [550, 990, 1980]
      this.ad_base = [70, 126, 252]
      this.size = this.size_base[this.lvl],
      this._hp = this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 75,
      this._as = 0.6,
      this.range = 1,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
      ]
      this.util = {
        sp: 1000,
        ad_multiplier_base: [2.1, 3.2, 4.3],
        as_multiplier_base: [0.3, 0.5, 0.7],
        duration: 6*60
      }
      this.spell_pre = 15
      this.spell = function pyroclasm () {
        let grids = this.vm.board.grid
        let avails = []
        for (let r in grids) {
          for (let c in grids[r]) {
            let tgt = grids[r][c]
            if (tgt != undefined && tgt.camp != this.camp) {
              avails.push([tgt, tgt.hp_])
            }
          }
        }
        let sortedAvails = avails.sort((a,b) => a[1]-b[1])
        for (let i in sortedAvails) {
          let six = this.vm.getSixPos(sortedAvails[i].pos)
          for (let j in six) {
            if (grids[six[j][0]][six[j][1]] == undefined) {
              this.status.attack = undefined
              this.status.spell = undefined
              this.status.jump = {p:0, pn:this.util.spell_sp, src: this.pos, tgt: six[j]}
              this.buff.push(new buff_val(this.vm, this, 'ad', 0, this.util.ad_multiplier_base[this.lvl], '野蛮之击_攻击力', this.util.duration))
              this.buff.push(new buff_val(this.vm, this, 'as', 0, this.util.as_multiplier_base[this.lvl], '野蛮之击_攻速', this.util.duration))
              this.buff.push(new buff_val(this.vm, this, 'crit', 0, 0.25, '野蛮之击_暴击', this.util.duration))
              break
            }
          }
        }
      }
    }
  },

  class GangPlank extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 32,
      this._name = '海洋之灾',
      this.src = 'GangPlank.png',
      this.cat = [0, 3, 5],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [700, 1260, 2520]
      this.ad_base = [65, 117, 234]
      this.size = this.size_base[this.lvl],
      this._hp = this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 100,
      this._as = 0.65,
      this.range = 1,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
        new buff_gangplank_keg()
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 15
      this.spell = function powder_kegs () {
        for (let i in this.buff) {
          this.buff[i].response('detonate')
        }
      }
    }
  },

  class GangPlank extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 32,
      this._name = '海洋之灾',
      this.src = 'GangPlank.png',
      this.cat = [0, 3, 5],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [700, 1260, 2520]
      this.ad_base = [65, 117, 234]
      this.size = this.size_base[this.lvl],
      this._hp = this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 100,
      this._as = 0.65,
      this.range = 1,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
        new buff_gangplank_keg()
      ]
      this.util = {
        sp: 1000,
      }
      this.spell_pre = 15
      this.spell = function powder_kegs () {
        for (let i in this.buff) {
          this.buff[i].response('detonate')
        }
      }
    }
  },

  class Reksai extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 33,
      this._name = '虚空遁地者',
      this.src = 'Reksai.png',
      this.cat = [7, 8],
      this.lvl = lvl
      this.size_base = [0.65, 0.8, 0.95]
      this.hp_base = [650, 1170, 2340]
      this.ad_base = [50, 90, 180]
      this.size = this.size_base[this.lvl],
      this._hp = this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 150,
      this._as = 0.6,
      this.range = 1,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this._crit = 0.25,
      this.buff = [
        new buff_gangplank_keg()
      ]
      this.util = {
        sp: 1000,
        spell_sp: 20
      }
      this.spell_pre = 0
      this.spell = function powder_kegs () {
        let grids = this.vm.board.grid
        let avails = []
        for (let r in grids) {
          for (let c in grids[r]) {
            let tgt = grids[r][c]
            if (tgt != undefined && tgt.camp != this.camp && this.vm.getDistance(r, c, ...this.pos) <= 2) {
              avails.push(tgt)
            }
          }
        }
        let tgtOppPos = avails[randInt(avails.length)].pos
        let six = this.vm.getSixPos(tgtOppPos)
        let tgt = six[randInt(six.length)]
        this.status.attack = undefined
        this.status.spell = undefined
        this.status.jump = {p:0, pn:this.util.spell_sp, src: this.pos, tgt: tgt}
        
      }
    }
  }
]