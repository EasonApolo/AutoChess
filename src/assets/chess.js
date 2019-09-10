import { util_obama_second_bullet, util_tristana_bomb } from "./util";
import { randInt, removeFromArr } from './helper'
import { setTimeout } from "core-js";

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

export class buff_obama_nextAttackWith extends buff {
  constructor (vm, src, tgt) {
    super(vm, src)
    this.tgt = tgt
    this.base = [100, 225, 350]
  }
  response (type, ...args) {
    if (type === 'attack') {
      setTimeout(() => {
        if (this.tgt) {
          new util_obama_second_bullet(this.vm, this.src, this.tgt, this.base[this.src.lvl])
        }
      }, 300)
      removeFromArr(this.src.buff, this)
    }
  }
}

export class buff_tristana_explosiveSpark extends buff {
  constructor (vm, src, tgt) {
    super(vm, src)
    this.stage = 0
    this.tgt = tgt
    this.base = [150, 225, 300]
    this.lvl = src.lvl
    this.damage = 0
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
  constructor (vm, src, type, val, rate=0) {
    super(vm, src)
    this.type = type
    this.val = val
    this.rate = rate
  }
  response (type) {
    if (type === this.type) {
      return [this.val, this.rate]
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
}

// chess class definitions:

export default [
  class 麦林炮手 extends chess {
    constructor (vm) {
      super(vm)
      this.id = 0,
      this.name = '麦林炮手',
      this.size = 1,
      this.cat = [0, 1],
      this.src = 'Tristana_d.png',
      this.hp = 550,
      this.mp = 100,
      this._ad = 50,
      this.as = 0.65,
      this.sp = 75,
      this.range = 4,
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
      this.spell = function explosiveSpark () {
        if (this.status.target) {
          new util_tristana_bomb(this.vm, this, this.status.target)
        }
      }
    }
  },

  class 圣枪游侠 extends chess {
    constructor (vm) {
      super(vm)
      this.id = 1,
      this.name = '圣枪游侠',
      this.size = 1,
      this.cat = [0, 2],
      this.src = 'Obama_d.png',
      this.hp = 550,
      this.mp = 100,
      this._ad = 65,
      this.as = 0.65,
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
      this.buff.push(new buff_val(this.vm, this, 'ad', 100))
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
            this.status.jump = {p:0, pn:this.util.spell_sp, src: this.pos, tgt: avails[randInt(avails.length)]}
            this.status.ready = undefined
            this.status.attack = undefined
            this.buff.push(new buff_obama_nextAttackWith(this.vm, this, this.status.target))
          } else {  // no available jump position
            return false
          }
        }
      }
    }
  }
]