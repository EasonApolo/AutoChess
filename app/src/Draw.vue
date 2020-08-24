<script>
import PosInfo from './assets/position'
import ColorInfo from './assets/color'

export default {
  data () {
    return {
      canvas: undefined,
      ctx: undefined,
    }
  },
  methods: {
    /*
      draw functions
      */
    clearAll () {
      let ctx = this.ctx
      ctx.clearRect(0, 0, this.w, this.h)
    },
    drawUtil () {
      let util = this.util
      let ctx = this.ctx
      let info = PosInfo.board
      let xbase = this.w/2-6.5*info.ratio*info.w1
      let ybase = info.marTop+info.h/2-3.75*info.w1
      for (let i in util) {
        util[i].draw(ctx, xbase, ybase)
      }
    },
    drawBoard () {
      let ctx = this.ctx
      let info = PosInfo.board
      let grid = this.board.grid
      const bw = info.w
      const bh = info.h
      const w1 = info.w1
      const w2 = info.w2
      const ratio = info.ratio
      ctx.fillStyle = ColorInfo.board
      ctx.fillRect(this.w/2-bw/2, 0, bw, bh)
      for (let i in grid) {
        let bias = i % 2 == 1 ? ratio*w1/2 : -ratio*w1/2
        let cenT = bh/2+(i-2.5)*1.5*w1
        for (let j in this.board.grid[i]) {
          let cenL = this.w/2+(j-3)*ratio*2*w1+bias
          // grid
          ctx.beginPath()
          for (let k =0; k < 6; k++) {
            let rad = Math.PI*(1/3*k-1/6)
            let x = Math.cos(rad) * w1
            let y = Math.sin(rad) * w1
            this.ctx.lineTo(cenL+x, cenT+y)
          }
          ctx.closePath()
          ctx.strokeStyle = ColorInfo.obj
          ctx.stroke()
          let chess = grid[i][j]
          if (chess !== undefined) {
            let biasX=0, biasY=0
            // status:move position bias
            if (chess.status.move >= 0) {
              let rad = (5-chess.orient)*Math.PI/3
              let biasD = ratio*2*w1*(1-chess.status.move/chess.sp)
              biasX = biasD * Math.cos(rad)
              biasY = -biasD * Math.sin(rad)
            }
            // status:jump position bias
            if (chess.status.jump) {
              let jump = chess.status.jump
              let [x0, y0] = this.getCoord(...jump.src)
              let [x1, y1] = this.getCoord(...jump.tgt)
              biasX = -(x1-x0)*(1-jump.p/jump.pn)
              biasY = -(y1-y0)*(1-jump.p/jump.pn)
            }
            // img
            let img = new Image()
            img.src = chess.src
            let imgW = chess.size * w2
            ctx.drawImage(img, cenL-imgW/2+biasX, cenT-imgW/2+biasY, imgW, imgW)
            // hp
            ctx.fillStyle = chess.camp===0 ? ColorInfo.chessHp:ColorInfo.chessHpOppo
            ctx.fillRect(cenL-info.hpW/2+biasX, cenT-info.hpT+biasY, chess.hp_/chess.hp*info.hpW, info.hpH)
            // shield
            let shield = chess.getShield()
            if (shield) {
              ctx.fillStyle = ColorInfo.chessShield
              ctx.fillRect(cenL+info.hpW*(chess.hp_/chess.hp-1/2)+biasX, cenT-info.hpT+biasY, shield/chess.hp*info.hpW, info.hpH)
            }
            if (chess.mp) {
              ctx.fillStyle = ColorInfo.chessMp
              ctx.fillRect(cenL-info.hpW/2+biasX, cenT-info.mpT+biasY, chess.mp_/chess.mp*info.hpW, info.hpH)
            }
            if (chess.status.spell) {
              let rate = Math.min([chess.status.spell/chess.spell_pre, 1])
              if (chess.status.spell > chess.spell_pre && chess.spell_post) {
                rate = (chess.status.spell - chess.spell_pre) / (chess.spell_post - chess.spell_pre)
              }
              ctx.fillStyle = ColorInfo.chessSp
              ctx.fillRect(cenL-info.hpW/2+biasX, cenT-info.spT+biasY, rate*info.hpW, info.hpH)
            }
            if (chess.status.stun) {
              if (chess.status.stun.type===0) {
                let startAngle = Math.PI*2*(chess.status.stun.p%36)/36
                ctx.strokeStyle = '#666'
                ctx.lineWidth = 4
                ctx.beginPath()
                ctx.arc(cenL+biasX, cenT-50+biasY, 20, startAngle, Math.PI*5/3+startAngle)
                ctx.stroke()
                ctx.lineWidth = 1
              }
            }
            // buff
            for (let i in chess.buff) {
              if (chess.buff[i].draw) {
                chess.buff[i].draw(ctx, cenL+biasX, cenT+biasY)
              }
            }
            for (let i in chess.equips) {
              let img = new Image()
              img.src = chess.equips[i].src
              let imgR = info.w2/2*chess.size
              let equipR = info.wEquip * chess.size
              ctx.drawImage(img, cenL-imgR+biasX+equipR*i, cenT+imgR+biasY, equipR, equipR)
            }
          }
        }
      }
    },
    drawHand () {
      let ctx = this.ctx
      let info = PosInfo.hand
      const cw = info.w1
      const sp = info.sp
      const hw = info.w
      const hh = info.h
      const handT = info.marTop
      let handL = this.w/2-hw/2
      let cards = this.hand.cards
      ctx.fillStyle = ColorInfo.section
      ctx.fillRect(handL, handT, hw, hh)
      for (let i in cards) {
        ctx.strokeStyle = ColorInfo.obj
        let cardL = this.w / 2 + (i-4-0.5)*cw+(i-4)*sp
        let cardT = handT + sp
        ctx.strokeRect(cardL, cardT, cw, cw)
        if (cards[i]) {
          let img = new Image()
          img.src = cards[i].src
          ctx.drawImage(img, cardL, cardT, cw, cw)
          for (let j in cards[i].equips) {
            let img = new Image()
            img.src = cards[i].equips[j].src
            ctx.drawImage(img, cardL+info.wEquip*j, cardT+cw-info.wEquip, info.wEquip, info.wEquip)
          }
        }
      }
    },
    drawStore () {
      let ctx = this.ctx
      let info = PosInfo.store
      const bw = info.w
      const bh = info.h
      const cw = info.w1
      const sp = info.sp
      const bth = info.bh
      let strL = this.w/2-bw/2
      let strT = this.h-bh
      ctx.fillStyle = ColorInfo.section
      ctx.fillRect(strL, strT, bw, bh)
      let cards = this.store.cards
      for (let i in cards) {
        ctx.strokeStyle = ColorInfo.obj
        let cardL = strL + bw + (i - 5) * cw + (i - 5) * info.sp
        let cardT = strT + info.sp
        ctx.strokeRect(cardL, cardT, cw, cw)
        if (cards[i] === undefined) continue
        ctx.fillStyle = ColorInfo.cardText
        ctx.font = '28px YaHei'
        ctx.textAlign = 'start'
        ctx.fillText(cards[i].name, cardL+14, cardT+36)
        for (let j in cards[i].cat) {
          ctx.fillText(ClassInfo[cards[i].cat[j]].name, cardL+14, cardT+120+j*40)
        }
      }
      // first button
      ctx.textBaseline="top"
      ctx.fillStyle = ColorInfo.gold
      ctx.fillText(this.game.gold, strL+sp, strT+sp)
      // second redeal button
      ctx.textAlign = 'end'
      ctx.fillStyle = ColorInfo.reDealButton
      ctx.fillRect(strL+sp, strT+sp*2+bth, cw, bth)
      ctx.fillStyle = 'white'
      ctx.fillText(this.game.costRedeal, strL+sp+cw-50, strT+sp*2+bth+40)
      //third upgrade button
      ctx.fillStyle = ColorInfo.upgradeButton
      ctx.fillRect(strL+sp, strT+sp*3+bth*2, cw, bth)
      ctx.fillStyle = 'white'
      ctx.fillText('level'+this.game.lvl, strL+sp+cw-50, strT+sp*3+bth*2+10)
      ctx.fillText(this.game.costUpgrade, strL+sp+cw-50, strT+sp*3+bth*2+40)
    },
    drawHold () {
      if (this.hold !== undefined) {
        let ctx = this.ctx
        let img = new Image()
        img.src = this.hold.src
        let w = PosInfo.hand.w1
        let wEquip = PosInfo.hand.wEquip
        let l = this.mouse.x-w/2
        let t = this.mouse.y-w/2
        ctx.drawImage(img, l, t, w, w)
        if (this.hold instanceof chess) {
          for (let j in this.hold.equips) {
            let img = new Image()
            img.src = this.hold.equips[j].src
            ctx.drawImage(img, l+wEquip*j, t+w-wEquip, wEquip, wEquip)
          }
        }
      }
    },
    drawDamageRecord () {
      let ctx = this.ctx
      let info = PosInfo.record
      let record = this.game.damageRecord
      ctx.fillStyle = 'green'
      for (let i in record) {
        ctx.textAlign = 'right'
        ctx.fillText(ChessInfo[record[i].id].name, info.l, info.t+i*info.sph)
        ctx.textAlign = 'left'
        ctx.fillText(record[i].val, info.l+info.spw, info.t+i*info.sph)
      }
    },
    drawclasses () {
      let ctx = this.ctx
      let info = PosInfo.class
      let classes = this.game.classes
      let i = 0
      for (let c in classes) {
        ctx.fillStyle = '#333333'
        ctx.textAlign = 'right'
        ctx.fillText(ClassInfo[c].name, info.l, info.t+info.sph*i)
        ctx.textAlign = 'right'
        ctx.fillText(classes[c].n, info.l+info.spw, info.t+info.sph*i)
        ctx.textAlign = 'left'
        for (let s in ClassInfo[c].stage) {
          if (classes[c].active && classes[c].active=== s) {
              ctx.fillStyle = '#333333'
          } else {
            ctx.fillStyle = '#999999'
          }
          ctx.fillText(ClassInfo[c].stage[s], info.l+2*info.spw+25*(s), info.t+info.sph*i)
        }
        i++
      }
    },
    drawEquips () {
      let ctx = this.ctx
      let equips = this.equips
      let info = PosInfo.equips
      for (let i in equips) {
        ctx.strokeStyle = '#999999'
        ctx.strokeRect(info.l, info.t+info.h*i, info.h, info.h)
        if (equips[i]) {
          let img = new Image()
          img.src = equips[i].src
          ctx.drawImage(img, info.l, info.t+info.h*i, info.h, info.h)
        }
      }
    },
    drawSchedule () {
      let ctx = this.ctx
      let sch = this.game.schedule
      let info = PosInfo.schedule
      if (sch.status === 'prepare' || sch.status === 'battle' && sch.p >= sch.pn) {
        ctx.lineWidth = 5
        ctx.beginPath()
        if (sch.p <= sch.pn) {
          ctx.strokeStyle = '#555'
          ctx.arc(this.w/2, info.t, info.arcR, Math.PI/2-(1-sch.p/sch.pn)*Math.PI*2, Math.PI/2)
        } else {
          let opacity = (40-Math.abs(((sch.p-sch.pn)%80)-40))*0.02
          ctx.strokeStyle = `rgba(85, 85, 85, ${opacity})`
          ctx.arc(this.w/2, info.t, info.arcR, -Math.PI*3/2, Math.PI/2)
        }
        ctx.stroke()
        ctx.lineWidth = 1
      }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(this.room.stage, this.w/2, info.t)
    },
    drawPlayers () {
      let ctx = this.ctx
      let info = PosInfo.player
      for (let i in this.room.users) {
        let user = this.room.users[i]
        ctx.fillText(user.hp, this.w/2+info.l, info.t+info.sph*i)
        ctx.fillText(user.name, this.w/2+info.l+info.spw, info.t+info.sph*i)
      }
    },
    drawDamageDisplay () {
      let ctx = this.ctx
      for (let i in this.game.damageDisplays) {
        this.game.damageDisplays[i].draw(ctx)
      }
    }
  }
}
</script>