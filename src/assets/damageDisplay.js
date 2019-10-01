import { removeFromArr } from './helper'
import PosInfo from './position'

export class DamageDisplay {
    constructor (vm, type, pos, damage) {
        this.vm = vm
        this.damage = damage.toFixed(0)
        this.coord = this.vm.getCoord(...pos)
        switch (type) {
            case 0: this.color = '255,0,0,';break;
            case 1: this.color = '0,0,255,';break;
            case 2: this.color = '200,200,200,';break;
        }
        this.now = 0
        this.len = 50
        let info = PosInfo.board
        const bMarTop = info.marTop
        const bh = info.h
        const w1 = info.w1
        const ratio = info.ratio
        let i = pos[0], j = pos[1]
        let bias = i % 2 == 1 ? bias = ratio*w1/2 : -ratio*w1/2
        this.cenT = bh/2+bMarTop+(i-2.5)*1.5*w1
        this.cenL = this.vm.w/2+(j-3)*ratio*2*w1+bias
    }
    draw (ctx) {
        this.now ++
        if (this.now === this.len) removeFromArr(this.vm.game.damageDisplays, this)
        let rate = this.now / this.len
        let biasX = 30 * rate
        let biasY = 20 * rate
        let opacity = 1 - rate
        ctx.lineWidth = 3
        ctx.fillStyle = `rgba(${this.color}${opacity})`
        ctx.fillText(this.damage, this.cenL+biasX, this.cenT+biasY)
        ctx.lineWidth = 1
    }
}