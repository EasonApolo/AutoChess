export class buff_regainMana {
    constructor (src) {
        this.src = src
    }
    response (vm, type, ...args) {
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
export class buff_tristana_explosiveSpark {
    constructor (src, tgt) {
        this.stage = 0
        this.src = src
        this.tgt = tgt
        this.base = [150, 225, 300]
        this.lvl = src.lvl
        this.damage = 0
    }
    response (vm, type, ...args) {
        if (type === 'damage') {
            console.log(this.stage)
            let util = args[1]
            if (util.tgt === this.tgt) {
                this.stage ++
                if (this.stage >= 3) {
                    this.damage = (1 + this.stage * 0.5) * this.base[this.lvl]
                    this.tgt.buff.splice(this.tgt.buff.indexOf(this), 1)
                    let sixpos = vm.getSixPos(this.tgt.pos)
                    for (let i in sixpos) {
                        let pos = sixpos[i]
                        let adj = vm.board.grid[pos[0]][pos[1]]
                        if (adj != undefined) {
                            vm.damage(this, adj)
                        }
                    }
                    vm.damage(this)
                }
            }
        }
    }
    draw (ctx, cenL, cenT) {
        ctx.fillStyle = 'red'
        let r = 4*this.stage
        ctx.fillRect(cenL-r, cenT-r,2*r,2*r)
    }
}
export function randInt (r, s=0) {
    return Math.floor(Math.random()*r)+s
}
export default [
    class 麦林炮手 {
        constructor () {
            this.id = 0,
            this.name = '麦林炮手',
            this.size = 1,
            this.cat = [0, 1],
            this.src = 'Tristana_d.png',
            this.hp = 550,
            this.mp = 100,
            this.ad = 1,
            this.as = 0.7,
            this.sp = 75,
            this.range = 4,
            this.util = {
                sp: 800,
            },
            this.lvl = 0
            this.buff = [
            ],
            this.spell = function explosiveSpark () {
                if (this.status.target) {
                    this.status.target.buff.push(new buff_tristana_explosiveSpark(this, this.status.target))
                }
            }
        }
    },
    class 圣枪游侠 {
        constructor () {
            this.id = 1,
            this.name = '圣枪游侠',
            this.size = 1,
            this.cat = [0, 2],
            this.src = 'Obama_d.png',
            this.hp = 550,
            this.mp = 100,
            this.ad = 2,
            this.as = 0.65,
            this.range = 3,
            this.sp = 60,
            this.util = {
                sp: 1000,
            },
            this.lvl = 0
            this.buff = [
            ]
            this.spell = function slipper (vm) {
                if (this.status.target) {
                    let grid = vm.board.grid
                    let avails = []
                    for (let r in grid) {
                        for (let c in grid[r]) {
                            if (grid[r][c] === undefined && vm.getDistance([r,c], this.pos) <= 2 && vm.getDistance([r,c],this.status.target.pos) <= this.range) {
                                avails.push([r,c])
                            }
                        }
                    }
                    if (avails.length) {
                        this.status.jump = {p:0, pn: 30, tgt: randInt(avails.length)}
                        this.status.ready = false
                        this.status.attack = 0
                        this.buff.push(new buff_obama_nextAttackWith(this, this.status.target))
                    } else {    // no available jump position
                        return false
                    }
                }
            }
        }
    }
]