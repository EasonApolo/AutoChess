import { util_lucian_second_bullet, util_tristana_bomb, util_yasuo_tempest, util_yasuo_tornado, util_graves_buckshot } from "./util";
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
    if (['damage', 'attack'].includes(type)) {
      if (type === 'damage') {
        let val = args[0]
        let util = args[1]
        let regain = val * 0.1
        this.src._mp += regain
      } else if (type === 'attack') {
        this.src._mp += randInt(5, 6)
      }
      // prevent overflow
      if (this.src._mp >= this.src.mp) this.src._mp = this.src.mp
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
    if (type === 'attack') {
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
    setTimeout(() => {
      if (this.damage === 0) {    // warning
        this.explode()
      }
    }, 4000)
  }
  response (type, ...args) {
    if (type === 'damage') {
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
    if (['attack'].includes(type)) {
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

export class buff_class_gun extends buff {
  constructor (vm, src, stage) {
    super(vm, src)
    this.base = [1, 2, 3]
    this.extra = this.base[stage]
    this.name = '枪手'
  }
  response(type, ...args) {
    if (['attack'].includes(type)) {
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


export class chess {
  constructor (vm) {
    this.vm = vm
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
    }
  }
  get ad () {
    let rate = 1
    let bonus = 0
    for (let i in this.buff) {
      let res = this.buff[i].response('ad')
      if (res) {
        if (res[1]) {
          rate += res[0]
        } else {
          bonus += res[0]
        }
      }
    }
    return (this._ad + bonus) * rate
  }
  set ad (ad) {
    this._ad = ad
  }
  get name () {
    return this._name
  }
  set name (name) {
    this._name = name
  }
  get as () {
    let rate = 1
    for (let i in this.buff) {
      let res = this.buff[i].response('as')
      if (res) {
        if (res[1]) {
          rate += res[0]
        } else {
          console.log('myError：as buff not rate')
        }
      }
    }
    return this._as * rate
  }
  set as (as) {
    this._as = as
  }
  get range () {
    let rate = 1
    for (let i in this.buff) {
      let res = this.buff[i].response('range')
      if (res) {
        if (res[1]) {
          rate += res[0]
        } else {
          console.log('myError：as buff not rate')
        }
      }
    }
    return this._range * rate
  }
  set range (range) {
    this._range = range
  }
}

// chess class definitions:

export default [
  class Tristana extends chess {
    constructor (vm) {
      super(vm)
      this.id = 0,
      this._name = '麦林炮手',
      this.size = 0.8,
      this.cat = [0, 1],
      this.src = 'Tristana_d.png',
      this.hp = 550,
      this.mp = 50,
      this._ad = 50,
      this._as = 0.65,
      this.sp = 75,
      this._range = 4,
      this.armor = 20,
      this.mr = 20,
      this.util = {
        sp: 800,
        bomb_sp: 600,
        bomb_sz: 6
      },
      this.lvl = 0
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
    constructor (vm) {
      super(vm)
      this.id = 1,
      this._name = '圣枪游侠',
      this.size = 0.8,
      this.cat = [0, 2],
      this.src = 'Lucian_d.png',
      this.hp = 550,
      this.mp = 35,
      this._ad = 65,
      this._as = 0.65,
      this.range = 3,
      this.sp = 60,
      this.armor = 20,
      this.mr = 20,
      this.util = {
        sp: 1000,
        spell_sp: 20,
        sz: 10,
      },
      this.lvl = 0
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
    constructor (vm) {
      super(vm)
      this.id = 2,
      this._name = '疾风剑豪',
      this.lvl = 0
      this.size = 0.8,
      this.cat = [3, 4],
      this.src = 'Yasuo_d.png',
      this.hp = 700,
      this.mp = 25,
      this._ad = 75,
      this._as = 1,
      this.range = 1,
      this.sp = 60,
      this.armor = 35,
      this.mr = 20,
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
    constructor (vm) {
      super(vm)
      this.id = 3,
      this._name = '法外狂徒',
      this.lvl = 0
      this.size = 0.8,
      this.cat = [0, 5],
      this.src = 'Graves_d.png',
      this.hp = 450,
      this.mp = 0,
      this._ad = 55,
      this._as = 0.55,
      this.range = 1,
      this.sp = 60,
      this.armor = 30,
      this.mr = 20,
      this.util = {
        sp: 1000,
      },
      this.buff = [
        new buff_graves_buckshot(this.vm, this)
      ]
    }
  },

  // class Aatrox extends chess {
  //   constructor (vm) {
  //     super(vm)
  //     this.id = 4,
  //     this._name = '暗裔剑魔',
  //     this.lvl = 0
  //     this.size = 0.8,
  //     this.cat = [3, 6],
  //     this.src = 'Aatrox.png',
  //     this.hp = 700,
  //     this.mp = 75,
  //     this._ad = 65,
  //     this._as = 0.65,
  //     this.range = 1,
  //     this.sp = 60,
  //     this.armor = 25,
  //     this.mr = 20,
  //     this.util = {
  //       sp: 1000,
  //     },
  //     this.buff = [
  //     ]
  //     this.spell_pre = 30
  //     this.spell_stage = 0
  //     this.spell = function the_darkin_blade () {
  //       if (this.status.target) {
          
  //         let [x0,y0] = this.vm.getCoord(...this.pos)
  //         let [x1,y1] = this.vm.getCoord(...this.status.target.pos)
  //         let tgtLen = this.vm.getEuclid(x0, y0, x1, y1)
  //         let info = PosInfo.board
  //         if (this.spell_stage < 2) {
  //           let len = info.w1*info.ratio*4
  //           let xt = len/tgtLen*(x1-x0)+x0
  //           let yt = len/tgtLen*(y1-y0)+y0
  //           new util_yasuo_tempest(this.vm, this, [x0,y0], [xt,yt])
  //           this.spell_stage ++
  //         } else {
  //           let len = info.w1*info.ratio*10
  //           let x_len = (x1-x0)/tgtLen*len
  //           let y_len = (y1-y0)/tgtLen*len
  //           new util_yasuo_tornado(this.vm, this, x_len, y_len)
  //           this.spell_stage = 0
  //         }
  //         this.status.spell = undefined
  //         this.status.attack = 0
  //       }
  //     }
  //   }
  // }
]