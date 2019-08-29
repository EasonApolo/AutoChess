<template>
  <div id="app">
    <canvas id='canvas' style='width:100%;height:100%' :width='w' :height='h' @click='click'></canvas>
    <div v-for='src in allsrc' :key='src' style='display:none'>
      <img :src='src'>
    </div>
  </div>
</template>

<script>
import CardInfo from './assets/card.js'
import TypeInfo from './assets/type.js'
import PosInfo from './assets/position.js'
import ChessInfo from './assets/chess.js'
import ColorInfo from './assets/color.js'
import { setTimeout } from 'timers'
var PF = require('pathfinding')

export default {
  name: 'app',
  data () {
    return {
      canvas: undefined,
      ctx: undefined,
      w: 0,
      h: 0,
      mouse: {x:undefined, y:undefined},
      game: {
        turn: 0,
        gold: 3,
        lvl: 1,
        costUpgrade: 4,
        costRedeal: 2
      },
      hold: undefined,
      board: {
        grid: [[], [], [], [], [], []],
        pfgrid: new PF.Grid(6, 7)
      },
      store: {
        cards: new Array(5).fill(undefined)
      },
      hand: {
        cards: new Array(9).fill(undefined)
      },
      color: {
      },
      allsrc: [],
      queue: []
    }
  },
  created () {
    addEventListener('mousemove', e => {
      this.mouse.x = e.clientX * 2
      this.mouse.y = e.clientY * 2
    })
    this.initBoard()
  },
  mounted () {
    this.w = document.documentElement.clientWidth*2
    this.h = document.documentElement.clientHeight*2
    this.canvas = document.getElementById('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.deal()
    this.main()
    setTimeout(() => {
      console.log('set opponent')
      this.setOppChess()
    }, 3000)
    setTimeout(() => {
      console.log('round start')
      this.startRound()
    }, 10000)
  },
  methods: {
    /*
      main thread
      */
    main () {
      this.clearAll()
      this.drawBoard()
      this.drawHand()
      this.drawStore()
      this.drawHold()
      for (let i in this.queue) {
        this.queue[i]()
      }
      window.requestAnimationFrame(this.main)
    },
    /*
      init functions
      */
    initBoard () {
      for (let i in this.board.grid) {
        for (let j = 0; j < 7; j++) {
          this.board.grid[i].push(undefined)
        }
      }
    },
    /*
      user actions
      */
    click (e) {
      let x = e.clientX*2
      let y = e.clientY*2
      let info = PosInfo.board
      if (x>this.w/2-info.w/2 && x<this.w/2+info.w/2 && y>info.marTop && y<info.marTop+info.h) {
        // x,y relative position to board centre
        let rx = x-this.w/2
        let ry = y-(info.h/2+info.marTop)
        let w = info.w1
        let k = Math.tan(Math.PI/6)
        let ratio = info.ratio
        // a,b,c are 3d index
        let a = Math.floor((ry+k*rx)/w)+8
        let b = Math.floor((ry-k*rx+w/2)/w)+7
        let c = Math.floor((rx+ratio/2*w)/(ratio*w))+7
        // j row index, i col index
        let j = Math.floor((a+b-7+1)/3)
        let i = Math.floor((c-(j%2+0.5)+1)/2)
        // out of grids
        if (i < 0 || i > 6 || j < 0 || j > 5) return
        else {
          this.setChess(j, i)
        }
      }
      info = PosInfo.hand
      if (x>this.w/2-info.w/2 && x<this.w/2+info.w/2 && y>info.marTop && y<info.marTop+info.h) {
        if ((x-(this.w/2-info.w/2)) % (info.sp+info.w1) < info.sp || (y-info.marTop) % (info.w1+info.sp) < info.sp) return // blank space
        let index = Math.floor((x-(this.w/2-info.w/2))/(info.sp+info.w1))
        let cards = this.hand.cards
        let tmp = this.hold
        this.hold = cards[index]
        cards[index] = tmp
      }
      info = PosInfo.store
      if (x>this.w/2-info.w/2 && x<this.w/2+info.w/2 && y>this.h-info.h && y<this.h) {
        let left = x-(this.w/2-info.w/2)
        let top = y-(this.h-info.h)
        if (left%(info.w1+info.sp)<info.sp || top%(info.w1+info.sp)<info.sp) return
        else if (left < info.w1+info.sp) {
          if (top%(info.bh+info.sp)<info.bh) return
          else if (Math.floor(top/(info.bh+info.sp)) == 1) {
            this.buyDeal()
          } else if (Math.floor(top/(info.bh+info.sp)) == 1) {
            this.buyUpgrade()
          }
        }
        else {
          let buy = Math.floor(left / (info.w1+info.sp)) - 1
          this.buyCard(buy)
        }
      }
    },
    /*
      store related functions
      */
    deal () {
      for (let i = 0; i < 5; i++) {
        let cardId = Math.floor(Math.random()*CardInfo.length)
        this.store.cards[i] = CardInfo[cardId]
      }
    },
    buyDeal () {console.log('deal')},
    buyUpgrade () {console.log('upgrade')},
    buyCard(storeId) {
      let wannaBuy = this.store.cards[storeId]
      if (this.game.gold >= wannaBuy.cost) {
        this.store.cards[storeId] = undefined
        this.game.gold -= wannaBuy.cost
        this.addChess(wannaBuy.id)
      }
    },
    /*
      game procedure
      */
    startRound () {
      this.queue.push(this.checkRemain)
      this.queue.push(this.actAll)
    },
    setOppChess () {
      this.setChess(1, 4, this.createChess(0, 1))
      this.setChess(0, 5, this.createChess(1, 1))
    },
    actAll () {
      let grid = this.board.grid
      for (let i in grid) {
        for (let j in grid[i]) {
          if (grid[i][j] !== undefined) {
            // if (grid[i][j].status.free) {
            //   this.findNearestOppo(grid[i][j], i, j)
            // }
          }
        }
      }
    },
    checkRemain () {
      let grid = this.board.grid
      let camp0 = 0
      let camp1 = 0
      for (let i in grid) {
        for (let j in grid[i]) {
          if (grid[i][j] === undefined) continue
          else if (grid[i][j].camp === 0) camp0++
          else if (grid[i][j].camp === 1) camp1++
        }
      }
      if (camp0 === 0) {console.log('you lose')}
      else if (camp1 === 0) {console.log('you win')}
    },
    /*
      game inline functions
      */
    findNearestOppo (chess, i, j) {

    },
    setGrid (i, j, chess) {
      this.board.grid[i][j] = chess
      this.board.pfgrid.setWalkableAt(i, j, chess===undefined)
    },
    setChess (j, i, chess=undefined) {
      let grid = this.board.grid
      // camp=0 friend, camp=1 opponent
      if (chess === undefined) {  // swap hold and grid[i][j]
        if (j <= 2) return        // cannot set at j<=2
        let tmp = this.hold
        this.hold = grid[j][i]
        this.setGrid(j, i, tmp)
      } else {  // system auto set
        this.setGrid(j, i, chess)
      }
    },
    addChess (cardId) {
      let cards = this.hand.cards
      for (let i in cards) {
        if (cards[i] === undefined) {
          cards[i] = this.createChess(cardId, 0)
          this.allsrc.push(cards[i].src)// create img element enable ctx.drawImage()
          break
        }
      }
    },
    createChess (id, camp) {
      let obj = Object.assign({}, ChessInfo[id])
      obj.hold = false         // init hold
      obj.camp = camp
      return obj
    },
    /*
      draw functions
      */
    clearAll () {
      let ctx = this.ctx
      ctx.clearRect(0, 0, this.w, this.h)
    },
    drawBoard () {
      let ctx = this.ctx
      let info = PosInfo.board
      let grid = this.board.grid
      const bMarTop = info.marTop
      const bw = info.w
      const bh = info.h
      const gr = info.w1
      const w2 = info.w2
      const ratio = info.ratio
      ctx.fillStyle = ColorInfo.section
      ctx.fillRect(this.w/2-bw/2, bMarTop, bw, bh)
      for (let i in grid) {
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
          ctx.strokeStyle = ColorInfo.obj
          ctx.stroke()
          let chess = grid[i][j]
          if (chess !== undefined) {
            let img = new Image()
            img.src = chess.src
            ctx.drawImage(img, cenL-w2/2, cenT-w2/2, w2, w2)
            // hp
            ctx.fillStyle = ColorInfo.chessHp
            ctx.fillRect(cenL-info.hpW/2, cenT-info.hpT, chess.hp/chess.hp*info.hpW, info.hpH)
            // hp border
            // ctx.strokeStyle = ColorInfo.chessHpBorder
            // ctx.strokeRect(cenL-info.hpW/2, cenT-info.hpT, info.hpW, info.hpH)
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
        if (cards[i] != undefined) {
          let img = new Image()
          img.src = cards[i].src
          ctx.drawImage(img, cardL, cardT, cw, cw)
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
          ctx.fillText(TypeInfo[cards[i].cat[j]], cardL+14, cardT+120+j*40)
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
        ctx.drawImage(img, this.mouse.x-w/2, this.mouse.y-w/2, w, w)
      }
    }
  }
}
</script>

<style lang="scss">
html {
  height: 100%;
}
body {
  margin: 0;
  height: 100%;
}
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
  text-align: center;
  color: #2c3e50;
}
</style>
