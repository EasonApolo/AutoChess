<template>
  <div id="app">
    <canvas id='canvas' style='width:100%;height:100%' :width='w' :height='h'></canvas>
  </div>
</template>

<script>
export default {
  name: 'app',
  data () {
    return {
      canvas: undefined,
      ctx: undefined,
      w: 0,
      h: 0,
      board: {
        grid: [[], [], [], [], [], []]
      },
      store: {
        cards: [{}, {}, {}, {}, {}]
      },
      color: {
        section: 'rgb(250, 250, 250)',
        obj: 'rgb(100, 100, 100)'
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
    this.drawBoard()
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
    drawStore () {
      let ctx = this.ctx
      const bw = 1800
      const bh = 300
      const cw = 260
      let strL = this.w/2-bw/2
      let strT = this.h-bh
      ctx.fillStyle = this.color.section
      ctx.fillRect(strL, strT, bw, bh)
      let cards = this.store.cards
      for (let i in cards) {
        ctx.strokeStyle = this.color.obj
        ctx.strokeRect(strL + bw + (i - 5) * cw + (i - 5) * 20, strT + 20, cw, cw)
      }
    },
    drawBoard () {
      let ctx = this.ctx
      const bMarTop = 200
      const bw = 1500
      const bh = 1100
      const gr = 110
      const ratio = Math.sqrt(3) / 2
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
}
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
