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
import { ThrownUtil} from './assets/util'
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
        costRedeal: 2,
        damageRecord: [],
        grave: [],
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
      allsrc: [],
      queue: [],
      util: [],
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
    }, 1000)
    setTimeout(() => {
      console.log('round start')
      this.startRound()
    }, 4000)
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
      this.drawUtil()
      this.drawDamageRecord()
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
      this.initAllChess()
    },
    actAll () {
      let grid = this.board.grid
      for (let i in grid) {
        for (let j in grid[i]) {
          if (grid[i][j] !== undefined) {
            let chess = grid[i][j]
            if (chess.status.ready) {
              // res[0] nearest coordinate [r,c], undefined if no nearest
              // res[1] nearest distance, 100 if no nearest
              let res = this.findNearestOppo(chess, i, j)
              let nearestPos = res[0]
              let nearestDis = res[1]
              if (nearestPos !== undefined) {
                if (nearestDis <= chess.range) {
                  chess.status.ready=false
                  chess.status.attack=0
                  chess.status.target=grid[nearestPos[0]][nearestPos[1]]
                } else {
                  // when the target move, chess auto move once, and check another best target. So don't fix status.target.
                  this.moveChess(chess, nearestPos)
                }
              }
            }
            else if (chess.status.attack >= 0)  {
              // if target been destroyed (set to undefined)
              if (chess.status.target !== undefined && chess.status.target.status.dead) {
                chess.status.ready = true
                chess.status.attack = undefined
                chess.status.target = undefined
              } else if (this.getDistance(...chess.pos, ...chess.status.target.pos) > chess.range) {
                this.moveChess(chess, chess.status.target.pos)  // same, moveOnce, and find other best target
                chess.status.ready = true
                chess.status.attack = undefined
                chess.status.target = undefined
              } else {
                let attackTime = 1/chess.as*1000
                chess.status.attack += 16
                if (chess.status.attack >= attackTime) {
                  chess.status.attack = 0
                  console.log('attack')
                  this.createThrownUtil(chess, chess.status.target)
                }
              }
            }
          }
        }
      }
      let util = this.util
      for (let i in util) {
        if (util[i].status.prepare) {
          util[i].act(util[i])
        } else if (util[i].status.ready) {
          util[i].effect(util[i])
        }
      }
    },
    moveChess (chess, finalTarget) {
      let path = this.getPath(chess, finalTarget)
      console.log(chess.pos, path)
      if (path === undefined) {
        console.log(chess.pos, 'cannot move')
        return
      }
      let tgt = path[0]
      let grid = this.board.grid
      if (grid[tgt[0]][tgt[1]] === undefined) {// for ensurance, tgt should be undefined as it's selected by path-finding func.
        grid[chess.pos[0]][chess.pos[1]] = undefined
        grid[tgt[0]][tgt[1]] = chess
        chess.pos = tgt
        chess.status
      }
    },
    damage (util) {
      let damage = util.damage  // compute damage here
      let record = this.game.damageRecord
      if (util.src.camp === 0) {
        let pair = record.find(x => {return x.id === util.src.id})
        if (pair) {
          pair.val += damage
        } else {
          record.push({id: util.src.id, val: damage})
        }
        record.sort((a,b) => {a.val > b.val})
      }
      util.tgt._hp -= damage
      if (util.tgt._hp <= 0) {
        this.die(util.tgt)
      }
    },
    die (chess) {
      // remove chess from board
      let grid = this.board.grid
      grid[chess.pos[0]][chess.pos[1]] = undefined
      // set chess status as dead, so other chess and util will remove it.
      for (let i in chess.status) {
        chess.status[i] = undefined
      }
      chess.status.dead = true
    },
    ThrownUtilEffect (util) {
      this.damage(util)
      this.util.splice(this.util.indexOf(util), 1)
    },
    ThrownUtilAct (util) {
      let [x, y] = util.coord
      let [tx, ty] = this.getCoord(...util.tgt.pos)
      if (x === tx && y === ty) {
        util.status.ready=true
        util.status.prepare = false
      }
      let d = this.getEuclid(x, y, tx, ty)
      let dsp = util.sp/60/d
      if (dsp>1) {  // arrive tgt
        util.coord[0] = tx
        util.coord[1] = ty
      } else {
        util.coord[0] = x + dsp*(tx-x)
        util.coord[1] = y + dsp*(ty-y)
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
      this.queue.splice(this.queue.indexOf(this.checkRemain), 1)
    },
    // initialize all chesses at this round start
    initAllChess () {
      let grid = this.board.grid
      for (let i in grid) {
        for (let j in grid[i]) {
          let g = grid[i][j]
          if (g !== undefined) {
            g.status.ready = true
            g._hp = g.hp
          }
        }
      }
    },
    setOppChess () {
      this.setChess(0, 2, this.createChess(0, 1))
      this.setChess(1, 2, this.createChess(0, 1))
      this.setChess(1, 3, this.createChess(0, 1))
      this.setChess(2, 4, this.createChess(0, 1))
      this.setChess(2, 5, this.createChess(0, 1))
      this.setChess(0, 4, this.createChess(1, 1))
    },
    /*
      game inline functions
      */
    samePos(a, b) {
      return a[0] === b[0] && a[1] === b[1]
    },
    getPathNode (now, tgt, open, close, flag) {
      if (flag) console.log(now)
      close.push(now)
      // get six adjacent, test if each is OK, add OK to ablePos and global open, compute OK distance
      let sixPos = this.getSixPos(now)
      let avails = []
      for (let i in sixPos) {
        let pos = sixPos[i]
        if (this.samePos(tgt, pos)) return [pos]
        if (this.board.grid[pos[0]][pos[1]] !== undefined) {
          continue
        }
        let flag = false
        for (let j in close) {
          if (this.samePos(close[j], pos)) {flag = true; break}
        }
        if (flag) continue
        avails.push({pos: pos, d:this.getDistance(...pos,...tgt)})
      }
      if (avails.length === 0) {
        return undefined
      }
      // sort and search begin with smallest d
      avails.sort((a,b)=>a.d-b.d)
      let paths = []
      let minD = -1                     // nextNode with same weight should all been tested
      for (let i in avails) {
        if (avails[i].d !== minD) {
          minD = avails[i].d
          if (paths.length > 0) {
            return this.getShortestPath(paths)
          }
        }
        let res = this.getPathNode(avails[i].pos, tgt, open, close, flag)
        if (res) {
          res.unshift(avails[i].pos)    // unshift only return new-length
          paths.push(res)               // save result path
        }
      }
      if (paths.length > 0) return this.getShortestPath(paths)
    },
    getShortestPath (paths) {
      let minLen = 100
      let minInd = -1
      for (let j in paths) {
        if (paths[j].length < minLen) {
          minLen = paths[j].length
          minInd = j
        }
      }
      return paths[minInd]
    },
    getPath (chess, target) {
      let tgt = [Number(target[0]), Number(target[1])]
      let open = []
      let close = []
      let flag = this.samePos(chess.pos, [2,3]) ? true : false
      return this.getPathNode(chess.pos, tgt, open, close, flag)
    },
    getSixPos(cen) {
      let dir = cen[0]%2===1 ? [[-1,0],[-1,1],[0,1],[1,1],[1,0],[0,-1]] : [[-1,-1],[-1,0],[0,1],[1,0],[1,-1],[0,-1]]
      let sixPos = []
      for (let i in dir) {
        let v = dir[i]
        let r = cen[0]+v[0]
        let c = cen[1]+v[1]
        if (r<0||r>5||c<0||c>6) continue
        sixPos.push([r,c])
      }
      return sixPos
    },
    getCoord (r, c) {
      let w1 = PosInfo.board.w1
      let x = PosInfo.board.ratio * w1 * 2 * c + (r%2) * w1
      let y = r*3/2*w1
      return [x, y]
    },
    getEuclid (x1, y1, x2, y2) {
      return Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2))
    },
    getDistance (a, b, c, d) {
      a=Number(a), b=Number(b), c=Number(c), d=Number(d)
      let colD = undefined
      let rowD = Math.abs(a-c)
      let k = Math.ceil(rowD/2)
      let u = undefined
      let l = undefined
      let dis = undefined
      if (a%2 === c%2) {
        u = b+k
        l = b-k
      } else if (a%2 === 1) {
        u = b+k
        l = b-k+1
      } else if (c%2 === 1) {
        u = b+k-1
        l = b-k
      }
      if (d<=u && d>=l) {
        colD = 0
      } else if (d>u) {
        colD = d-u
      } else if (d<l) {
        colD = l-d
      }
      dis = colD + rowD
      return dis
    },
    findNearestOppo (chess, r, c) {
      let grid = this.board.grid
      let minDis = 100
      let minSet = []
      let nearest = undefined
      for (let i in grid) {
        for (let j in grid[i]) {
          if (grid[i][j] !== undefined) {
            if (grid[i][j].camp !== chess.camp) {
              let dis = this.getDistance(r,c, i,j)
              if (dis < minDis) {
                minDis = dis
                minSet = [[i,j]]
              } else if (dis == minDis) {
                minSet.push([i,j])
              }
            }
          }
        }
      }
      if (minSet.length > 1) {
        nearest = minSet[this.randInt(minSet.length)]
      } else {
        nearest = minSet[0]
      }
      return [nearest, minDis]
    },
    setGrid (i, j, chess) {
      if (chess !== undefined) {  // if undefined is set to this grid
        chess.pos = [i, j]
      }
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
      obj.pos = undefined
      obj.status = {}
      obj.camp = camp
      return obj
    },
    createThrownUtil (src, tgt) {
      let thrown = Object.assign({}, ThrownUtil)
      thrown.sp = src.util.sp
      thrown.tgt = tgt
      thrown.src = src
      thrown.damage = src.ad
      thrown.coord = this.getCoord(...src.pos)
      thrown.status = {prepare:true}
      thrown.act = this.ThrownUtilAct
      thrown.effect = this.ThrownUtilEffect
      this.util.push(thrown)
    },
    randInt (r, s=0) {
      return Math.floor(Math.random()*r)+s
    },
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
        let ut = util[i]
        ctx.fillStyle = 'blue'
        ctx.fillRect(xbase+ut.coord[0]-5, ybase+ut.coord[1]-5, 10, 10)
      }
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
            ctx.fillRect(cenL-info.hpW/2, cenT-info.hpT, chess._hp/chess.hp*info.hpW, info.hpH)
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
    },
    drawDamageRecord () {
      let ctx = this.ctx
      let info = PosInfo.record
      let record = this.game.damageRecord
      ctx.fillStyle = 'green'
      for (let i in record) {
        ctx.fillText(ChessInfo[record[i].id].name, info.l, info.t+i*info.sph)
        ctx.fillText(record[i].val, info.l+info.spw, info.t+i*info.sph)
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
#canvas {
  opacity: 0;
  &:hover {
    opacity: 1;
  }
}
</style>
