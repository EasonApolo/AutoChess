<template>
  <div id="app">
    <canvas id='canvas' style='width:100%;height:100%' :width='w' :height='h' @click='click'></canvas>
  </div>
</template>

<script>
import CardInfo from './assets/card.json'
import TypeInfo from './assets/type.json'
import PosInfo from './assets/position.js'

export default {
  name: 'app',
  data () {
    return {
      canvas: undefined,
      ctx: undefined,
      w: 0,
      h: 0,
      game: {
        turn: 0,
        gold: 1,
        lvl: 1,
        costUpgrade: 4,
        costRedeal: 2
      },
      board: {
        grid: [[], [], [], [], [], []]
      },
      store: {
        cards: [{}, {}, {}, {}, {}]
      },
      hand: {
        cards: [{}, {}, {}, {}, {}, {}, {}, {}, {}]
      },
      color: {
        section: 'rgb(250, 250, 250)',
        obj: 'rgb(100, 100, 100)',
        cardText: 'rgb(66, 66, 66)',
        reDealButton: 'rgb(199, 99, 99)',
        upgradeButton: 'rgb(99, 99, 199)',
        gold: '#ffd700'
      }
    }
  },
  created () {
    this.w = document.documentElement.clientWidth*2
    this.h = document.documentElement.clientHeight*2
    this.initBoard()
  },
  mounted () {
    this.canvas = document.getElementById('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.deal()
    this.drawBoard()
    this.drawHand()
    this.drawStore()
  },
  methods: {
    initBoard () {
      for (let i in this.board.grid) {
        for (let j = 0; j < 7; j++) {
          this.board.grid[i].push(undefined)
        }
      }
    },
    click (e) {
      let x = e.clientX*2
      let y = e.clientY*2
      let info = PosInfo.board
      if (x>this.w/2-info.w/2 && x<this.w/2+info.w/2 && y>info.marTop && y<info.marTop+info.h) {
        console.log('board')
      }
      info = PosInfo.hand
      if (x>this.w/2-info.w/2 && x<this.w/2+info.w/2 && y>info.marTop && y<info.marTop+info.h) {
        console.log('hand')
      }
      info = PosInfo.store
      if (x>this.w/2-info.w/2 && x<this.w/2+info.w/2 && y>this.h-info.h && y<this.h) {
        console.log('store')
      }
    },
    deal () {
      for (let i = 0; i < 5; i++) {
        let cardId = Math.floor(Math.random()*CardInfo.length)
        this.store.cards[i] = CardInfo[cardId]
      }
    },
    drawBoard () {
      let ctx = this.ctx
      let info = PosInfo.board
      const bMarTop = info.marTop
      const bw = info.w
      const bh = info.h
      const gr = info.w1
      const ratio = info.ratio
      ctx.fillStyle = this.color.section
      ctx.fillRect(this.w/2-bw/2, bMarTop, bw, bh)
      for (let i in this.board.grid) {
        let bias = i % 2 == 1 ? bias = ratio*gr/2 : -ratio*gr/2
        let cenT = bh/2+bMarTop+(i-2.5)*1.5*gr
        for (let j in this.board.grid[i]) {
          let cenL = this.w/2+(j-3)*ratio*2*gr+bias
          ctx.beginPath()
          for (let k =0; k < 6; k++) {
            let rad = Math.PI*(1/3*k-1/6)
            let x = Math.cos(rad) * gr
            let y = Math.sin(rad) * gr
            this.ctx.lineTo(cenL+x, cenT+y)
          }
          ctx.closePath()
          ctx.strokeStyle = this.color.obj
          ctx.stroke()
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
      ctx.fillStyle = this.color.section
      ctx.fillRect(handL, handT, hw, hh)
      for (let i in cards) {
        ctx.strokeStyle = this.color.obj
        let cardL = this.w / 2 + (i-4-0.5)*cw+(i-4)*sp
        let cardT = handT + sp
        ctx.strokeRect(cardL, cardT, cw, cw)
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
      ctx.fillStyle = this.color.section
      ctx.fillRect(strL, strT, bw, bh)
      let cards = this.store.cards
      for (let i in cards) {
        ctx.strokeStyle = this.color.obj
        let cardL = strL + bw + (i - 5) * cw + (i - 5) * info.sp
        let cardT = strT + info.sp
        ctx.strokeRect(cardL, cardT, cw, cw)
        ctx.fillStyle = this.color.cardText
        ctx.font = '28px YaHei'
        ctx.fillText(cards[i].name, cardL+14, cardT+36)
        for (let j in cards[i].cat) {
          ctx.fillText(TypeInfo[cards[i].cat[j]], cardL+14, cardT+120+j*40)
        }
      }
      // first button
      ctx.textBaseline="top"
      ctx.fillStyle = this.color.gold
      ctx.fillText(this.game.gold, strL+sp, strT+sp)
      // second redeal button
      ctx.textAlign = 'end'
      ctx.fillStyle = this.color.reDealButton
      ctx.fillRect(strL+sp, strT+sp*2+bth, cw, bth)
      ctx.fillStyle = 'white'
      ctx.fillText(this.game.costRedeal, strL+sp+cw-50, strT+sp*2+bth+40)
      //third upgrade button
      ctx.fillStyle = this.color.upgradeButton
      ctx.fillRect(strL+sp, strT+sp*3+bth*2, cw, bth)
      ctx.fillStyle = 'white'
      ctx.fillText('level'+this.game.lvl, strL+sp+cw-50, strT+sp*3+bth*2+10)
      ctx.fillText(this.game.costUpgrade, strL+sp+cw-50, strT+sp*3+bth*2+40)
    },
  }
}
</script>

<style lang="scss">
html {
  height: 100%;
}
body {
  margin: 0;
}
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
