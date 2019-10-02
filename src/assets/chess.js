import { util_lucian_second_bullet, util_tristana_bomb, util_yasuo_tempest, util_yasuo_tornado, util_graves_buckshot, util_aatrox_blade, util_chogath_rupture, util_varus_arrow, util_ashe_arrow } from "./util";
import { randInt, removeFromArr } from './helper'
import { setTimeout } from "core-js";
import PosInfo from './position'
import { timingSafeEqual } from "crypto";

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
  constructor (vm, src, type, val, rate=0, name=undefined) {
    super(vm, src)
    this.type = type
    this.val = val
    this.rate = rate
    if (name) {
      this.name = name
    }
  }
  response (type) {
    if (type === this.type) {
      return [this.val, this.rate]
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
    this.heal = 30
  }
  response(type, ...args) {
    if (['atk'].includes(type)) {
      this.vm.heal(this, this.src)
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
    }
  }
  unequip (index) {
    this.equips[index].unequipTo()
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
    return this.__checkBuff(this._hp, 'hp')
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
}

// chess class definitions:

export default [
  class Tristana extends chess {
    constructor (vm, lvl) {
      super(vm)
      this.id = 0,
      this._name = '麦林炮手',
      this.src = 'Tristana_d.png',
      this.cat = [0, 1],
      this.lvl = lvl
      this.size_base = [0.8, 0.9, 1]
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
      this.src = 'Lucian_d.png',
      this.cat = [0, 2],
      this.lvl = lvl
      this.size_base = [0.8, 0.9, 1]
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
      this.src = 'Yasuo_d.png',
      this.cat = [3, 4],
      this.lvl = lvl
      this.size_base = [0.8, 0.9, 1]
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
      this.src = 'Graves_d.png',
      this.cat = [0, 5],
      this.lvl = lvl
      this.size_base = [0.8, 0.9, 1]
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
      this.size_base = [0.8, 0.9, 1]
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
      this.size_base = [0.8, 0.9, 1]
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
      this.size_base = [0.8, 0.9, 1]
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
      this.size_base = [0.8, 0.9, 1]
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
      this.size_base = [0.8, 0.9, 1]
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
      this.size_base = [0.8, 0.9, 1]
      this.hp_base = [550, 990, 1980]
      this.ad_base = [65, 117, 234]
      this.size = this.size_base[this.lvl],
      this._hp= this.hp_base[this.lvl],
      this._ad = this.ad_base[this.lvl],
      this.mp = 25,
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
  }
]