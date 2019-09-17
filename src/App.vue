<template>
  <div id="app">
    <div v-if='entry.inentry' class='entry'>
      <div class='block'>
        <input v-model='entry.name' placeholder="name"><br>
        <button @click='fetchRooms'>寻找房间</button>
        <button @click='createRoom'>创建房间</button>
      </div>
    </div>
    <div v-if='!entry.inentry' class='game'>
      <canvas id='canvas' style='width:100%;height:100%' :width='w' :height='h' @click='click' @mousemove="mousemove"></canvas>
      <div v-for='src in allsrc' :key='src' style='display:none'>
        <img :src='src'>
      </div>
      <div class='show' v-if='showChess!==undefined' :style='{left:showPos[0],top:showPos[1]}'>
        {{showChess.name}}
        <div class='attr'>
          <div>ad:</div><div>{{showChess.ad.toFixed(0)}}</div>
          <div>as:</div><div>{{showChess.as.toFixed(2)}}</div>
          <div>range:</div><div>{{showChess.range.toFixed(0)}}</div>
          <div>armor:</div><div>{{showChess.armor.toFixed(0)}}</div>
          <div>mr:</div><div>{{showChess.mr.toFixed(0)}}</div>
        </div>
        <div class='buff'>
          <div v-for='(buff,i) in showChess.buff' :key='i'>
            {{buff.name}}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CardInfo from './assets/card'
import ClassInfo from './assets/class'
import PosInfo from './assets/position'
import ChessInfo, { chess, buff_regainMana } from './assets/chess'
import ColorInfo from './assets/color'
import { setTimeout } from 'timers'
import { util_tgt, util_attack} from './assets/util'
import { randInt, removeFromArr, numberize, findArr } from './assets/helper'
import EquipInfo, { equip } from './assets/equip'
import ScriptInfo from './assets/script'

export default {
  name: 'app',
  data () {
    return {
      entry: {
        inentry: true,
        name: ''
      },
      canvas: undefined,
      ctx: undefined,
      w: 0,
      h: 0,
      mouse: {x:undefined, y:undefined},  // this coordinate is doubled
      game: {
        turn: 0,
        gold: 100,
        lvl: 1,
        costUpgrade: 4,
        costRedeal: 2,
        damageRecord: [],
        grave: [],
        classes: {},
        schedule: {},
      },
      hold: undefined,
      board: {
        grid: [[], [], [], [], [], []],
      },
      store: {
        cards: new Array(5).fill(undefined)
      },
      hand: {
        cards: new Array(9).fill(undefined)
      },
      equips: new Array(9).fill(undefined),
      allsrc: [],
      queue: [],
      util: [],
      showChess: undefined,
      showPos: undefined
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
  },
  methods: {
    /*
      main thread
      */
    createRoom () {
      fetch('http://47.106.171.107/rooms/create', ).then(res => res.json()).then(json => {
        console.log(json)
      })
    },
    fetchRooms () {
      fetch('http://47.106.171.107/rooms/list').then(res => res.json()).then(json => {
        console.log(json)
      })
    },
    startGame () {
      this.w = document.documentElement.clientWidth*2
      this.h = document.documentElement.clientHeight*2
      this.canvas = document.getElementById('canvas')
      this.ctx = this.canvas.getContext('2d')
      this.deal()
      this.main()
      this.equips[0] = new EquipInfo[0]()
      this.equips[1] = new EquipInfo[0]()
      this.equips[2] = new EquipInfo[0]()
    },
    schedule () {
      let s = this.game.schedule
      if (s.status === 'prepare') {
        if (s.p < s.pn) {
          s.p ++
        } else {
          this.game.schedule = {status: 'setting', p: 0, pn: 300}
          this.setOppChess()
        }
      } else if (s.status === 'setting') {
        if (s.p < s.pn) {
          s.setting ++
        } else {
          this.game.schedule = {status: 'battle', p: 0}
          this.startRound()
        }
      } else if (s.status === 'battle') {
        if (s.p === 1) {
          this.game.schedule = {status: 'prepare', p: 0, pn: 300}
        }
      } else {
        this.game.schedule = {status: 'prepare', p: 0, pn: 300}
      }
    },
    main () {
      this.clearAll()
      this.drawBoard()
      this.drawHand()
      this.drawStore()
      this.drawHold()
      this.drawUtil()
      this.drawDamageRecord()
      this.drawclasses()
      this.drawEquips()
      this.drawSchedule()
      for (let i in this.queue) {
        this.queue[i]()
      }
      this.schedule()
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
    mousemove (e) {
      if (this.hold) {
        this.showChess = undefined
        this.showPos = undefined
        return
      }
      let x = e.clientX*2
      let y = e.clientY*2
      let pos = this.getPosByCoord(x, y)
      if (pos) {
        let [j, i] = pos
        if (this.board.grid[j][i]) {
          this.showChess = this.board.grid[j][i]
          this.showPos = [x/2+1+'px', y/2+1+'px']
          return
        }
      }
      this.showChess = undefined
      this.showPos = undefined
    },
    click (e) {
      let x = e.clientX*2
      let y = e.clientY*2
      // click board
      let pos = this.getPosByCoord(x, y)
      if (pos) {
        let [j, i] = pos
        // if hold a equipment, equit it to the chess
        if (this.hold instanceof equip) {
          if (this.board.grid[j][i]) {
            this.equiping(this.board.grid[j][i])
          }
        } else {
          this.setChess(j, i)
        }
      }
      // click hand
      let info = PosInfo.hand
      if (x>this.w/2-info.w/2 && x<this.w/2+info.w/2 && y>info.marTop && y<info.marTop+info.h) {
        if ((x-(this.w/2-info.w/2)) % (info.sp+info.w1) < info.sp || (y-info.marTop) % (info.w1+info.sp) < info.sp) return // blank space
        let index = Math.floor((x-(this.w/2-info.w/2))/(info.sp+info.w1))
        if (this.hold instanceof equip) {
          if (this.hand.cards[index]) {
            this.equiping(this.hand.cards[index])
          }
        }
        else {
          let cards = this.hand.cards
          let tmp = this.hold
          this.hold = cards[index]
          cards[index] = tmp
        }
      }
      // click store
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
      //click equip
      info = PosInfo.equips
      if (x>info.l && x<info.l+info.h && y>info.t && y<info.t+info.h*this.equips.length) {
        let index = Math.floor((y-info.t)/info.h)
        if (!this.hold || this.hold instanceof equip) {
          let tmp = this.hold
          this.hold = this.equips[index]
          this.equips[index] = tmp
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
                  chess.status.ready=undefined
                  chess.status.attack=0
                  chess.status.target=grid[nearestPos[0]][nearestPos[1]]
                } else {
                  // if target out of range, chess moves toward it for one step, then check best target again. So, no need to fix any target.
                  if (this.moveChess(chess, nearestPos)) {
                    chess.status.ready=undefined
                    chess.status.move = 0
                  }
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
                if (this.moveChess(chess, chess.status.target.pos)) {
                  chess.status.move = 0
                }  // same, moveOnce, and find other best target
                chess.status.attack = undefined
                chess.status.target = undefined
              } else {
                let attackTime = 1/chess.as*1000
                chess.status.attack += 16
                if (chess.status.attack >= attackTime) {
                  chess.status.attack = 0
                  this.dealBuff('attack', chess)
                  this.createUtilAttack(chess, chess.status.target)
                  if (chess._mp >= chess.mp) {  // 攻击完成后才会施法
                    this.castSpell(chess)
                  }
                }
              }
            }
            else if (chess.status.move >= 0) {
              chess.status.move ++
              if (chess.status.move >= chess.sp) {
                chess.status.move = undefined
                chess.status.ready = true
              }
            }
            else if (chess.status.jump) {
              let jump = chess.status.jump
              if (jump.p === 0) {
                if (grid[jump.tgt[0]][jump.tgt[1]] === undefined) {
                  grid[chess.pos[0]][chess.pos[1]] = undefined
                  grid[jump.tgt[0]][jump.tgt[1]] = chess
                  chess.pos = jump.tgt
                }
                jump.p ++
              }
              else if (jump.p >= jump.pn) {
                chess.status.jump = undefined
                if (chess.status.target) {
                  chess.status.attack = 0
                }
              }
              else {
                jump.p ++
              }
            }
            else if (chess.status.spell >= 0) {
              if (chess.status.spell < chess.spell_pre) {
                chess.status.spell ++
              } else {
                chess.status.spell = undefined
                chess.spell()
              }
            }
            else if (chess.status.stun) {
              let stun = chess.status.stun
              if (stun.p<stun.pn) {
                stun.p++
              } else {
                chess.status.stun = undefined
                chess.status.ready = true
              }
            }
          }
        }
      }
      let util = this.util
      for (let i in util) {
        if (util[i].status.prepare || util[i].status.done) {
          util[i].act()
        } else if (util[i].status.ready) {
          util[i].effect()
        }
      }
    },
    equiping (chess) {
      if (chess && this.hold instanceof equip) {
        chess.equip(this.hold)
        this.hold = undefined
      }
    },
    // if chess cannot move, return false
    moveChess (chess, finalTarget) {
      let path = this.getPath(chess, finalTarget)
      if (path === undefined) {
        return false
      }
      let tgt = path[0]
      let grid = this.board.grid
      if (grid[tgt[0]][tgt[1]] === undefined) {// for ensurance, tgt should be undefined as it's selected by path-finding func.
        chess.orient = this.getOrient(...chess.pos, ...tgt)
        grid[chess.pos[0]][chess.pos[1]] = undefined
        grid[tgt[0]][tgt[1]] = chess
        chess.pos = tgt
        chess.status.move = true
      }
      return true
    },
    // transition into pre_spell stage
    castSpell (chess) {
      if (chess.spell) {
        chess.status.attack = undefined
        chess.status.spell = 0
        chess._mp = 0
      }
    },
    damage (util, tgt=undefined) {
      if (!tgt) tgt = util.tgt
      // compute mitigated damage
      let damage = util.damage
      if (util.type === 0) {
        damage = this.mitigate(tgt.armor) * damage
      } else if (util.type === 1) {
        damage = this.mitigate(tgt.mr) * damage
      }
      // add damage to record
      let record = this.game.damageRecord
      if (util.src.camp === 0) {
        let intDamage = Math.round(damage)
        let pair = record.find(x => {return x.id === util.src.id})
        if (pair) {
          pair.val += intDamage
        } else {
          record.push({id: util.src.id, val: intDamage})
        }
        record.sort((a,b) => {a.val < b.val})
      }
      // deal damage
      tgt._hp -= damage
      // deal buffs
      this.dealBuff('damage', tgt, util.damage, util)  // use pre-mitigated damage
      // check vital status
      if (tgt._hp <= 0) {
        tgt.die()
      }
    },
    stun (util, tgt=undefined) {
      if (!tgt) {
        tgt = util.target
      }
      // stunning shouldn't stop jump
      tgt.status.attack = undefined
      tgt.status.spell = undefined
      tgt.status.ready = undefined
      tgt.status.stun = {type:util.stun_type,p:0,pn:util.stun}
    },
    mitigate (n) {
      return 100 / (n + 100)
    },
    dealBuff (type, ...args) {
      if (type === 'damage') {
        let [chess, val, util] = args
        for (let i in chess.buff) {
          chess.buff[i].response(type, val, util)
        }
      } else if (type === 'attack') {
        let [chess] = args
        for (let i in chess.buff) {
          chess.buff[i].response(type)
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
      if (this.game.schedule.status === 'battle') {
        this.game.schedule.p = 1
      }
    },
    // initialize all chesses at this round start
    initAllChess () {
      let grid = this.board.grid
      for (let i in grid) {
        for (let j in grid[i]) {
          let g = grid[i][j]
          if (g !== undefined) {
            g.status.ready = true
            g.orient = 0
            g._hp = g.hp
            if (g.mp) {
              g._mp = 0
              console.log(g.buff)
              g.buff.push(new buff_regainMana(this, g))
            }
          }
        }
      }
      this.game.classes = this.updateClasses(0)
      this.game.oppoClasses = this.updateClasses(1)
      this.initClassBuffs(0)
      this.initClassBuffs(1)
    },
    updateClasses (camp) {
      let grids = this.board.grid
      let classes = {}
      let info = ClassInfo
      let chessNames = []
      for (let r in grids) {
        for (let c in grids) {
          if (grids[r][c] !== undefined && grids[r][c].camp === camp && chessNames.indexOf(grids[r][c].name) < 0) {
            chessNames.push(grids[r][c].name)
            grids[r][c].cat.map(v => {
              if (v in classes) {classes[v].n++}
              else {classes[v] = {n:1}}
            })
          }
        }
      }
      for (let c in classes) {
        for (let s in info[c].stage) {
          if (info[c].exact && info[c].stage[s] === classes[c].n) {
            classes[c].active = s
          } else if (!info[c].exact) {
            if (info[c].stage[s] <= classes[c].n) {
              classes[c].active = s
            } else {
              break
            }
          }
        }
      }
      return classes
    },
    initClassBuffs (camp) {
      let classes = camp === 0 ? this.game.classes : this.game.oppoClasses
      for (let c in classes) {
        if (classes[c].active) {
          if (ClassInfo[c].buff) {  // note: all class has buff, this check is for development safety
            ClassInfo[c].buff(this, camp, classes[c].active)
          }
        }
      }
    },
    setOppChess () {
      this.setChess(0, 2, this.createChess(0, 1))
      // this.setChess(1, 2, this.createChess(0, 1))
      this.setChess(0, 4, this.createChess(1, 1))
    },
    /*
      game inline functions
      */
    // orient start: top-left 0
    getPosByCoord (x, y) {
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
        return [j, i]
      }
    },
    getOrient (r1,c1, r2,c2) {
      if (r1===r2) {
        return c1<c2?2:5
      } else {
        if (r1%2==1) {
          if (r2<r1) {
            return c1===c2?0:1
          } else {
            return c1===c2?4:3
          }
        } else {
          if (r2<r1) {
            return c1===c2?1:0
          } else {
            return c1===c2?3:4
          }
        }
      }
    },
    getOrientGrid (now, orient) {
      let pos = []
      let odd = now[0]%2
      if (orient < 2) {
        pos[0] = now[0] - 1
        pos[1] = odd?now[1]+orient:now[1]+orient-1
      } else if (orient == 3 || orient == 4) {
        pos[0] = now[0] + 1
        pos[1] = odd?now[1]+4-orient:now[1]+3-orient
      } else {
        pos = [now[0], orient === 2 ? now[1]+1:now[1]-1]
      }
      if (pos[0] < 0 || pos[0] > 5 || pos[1] < 0 || pos[1] > 6) return undefined
      return pos
    },
    samePos (a, b) {
      return a[0] === b[0] && a[1] === b[1]
    },
    getPathNode (now, tgt, open, close, displayflag) {
      if (displayflag) console.log(now)
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
            break
          }
        }
        let res = this.getPathNode(avails[i].pos, tgt, open, close.slice(), displayflag)
        if (res) {
          res.unshift(avails[i].pos)    // unshift only return new-length
          paths.push(res)               // save result path
        }
      }
      if (paths.length > 0) {
        let ret_path = this.getShortestPath(paths)
        return ret_path
      }
      else return undefined
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
      let tgt = numberize(target)
      let open = []
      let close = []
      let flag = this.samePos(chess.pos, [-1,-1]) ? true : false
      return this.getPathNode(chess.pos, tgt, open, close, flag)
    },
    getSixPos(cen) {
      cen = numberize(cen)
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
      [r, c] = numberize([r, c])
      let w1 = PosInfo.board.w1
      let x = PosInfo.board.ratio * w1 * 2 * c + (r%2) * w1
      let y = r*3/2*w1
      return [x, y]
    },
    getEuclid (x1, y1, x2, y2) {
      return Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2))
    },
    getDistance (a, b, c, d) {
      [a,b,c,d] = numberize([a,b,c,d])
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
        nearest = minSet[randInt(minSet.length)]
      } else {
        nearest = minSet[0]
      }
      if (nearest) {
        nearest = numberize(nearest)
      }
      return [nearest, minDis]
    },
    setGrid (i, j, chess) {
      if (chess !== undefined) {  // if undefined is set to this grid
        chess.pos = [i, j]
      }
      this.board.grid[i][j] = chess
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
      let obj = new ChessInfo[id](this)
      obj.hold = false         // init hold
      obj.pos = undefined
      obj.status = {}
      obj.camp = camp
      obj.equips = []
      return obj
    },
    createUtilAttack (src, tgt) {
      let u = new util_attack(this, src, tgt)
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
        util[i].draw(ctx, xbase, ybase)
      }
    },
    drawBoard () {
      let ctx = this.ctx
      let info = PosInfo.board
      let grid = this.board.grid
      const bMarTop = info.marTop
      const bw = info.w
      const bh = info.h
      const w1 = info.w1
      const w2 = info.w2
      const ratio = info.ratio
      ctx.fillStyle = ColorInfo.section
      ctx.fillRect(this.w/2-bw/2, bMarTop, bw, bh)
      for (let i in grid) {
        let bias = i % 2 == 1 ? bias = ratio*w1/2 : -ratio*w1/2
        let cenT = bh/2+bMarTop+(i-2.5)*1.5*w1
        for (let j in this.board.grid[i]) {
          let cenL = this.w/2+(j-3)*ratio*2*w1+bias
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
            // hp mp
            ctx.fillStyle = chess.camp===0 ? ColorInfo.chessHp:ColorInfo.chessHpOppo
            ctx.fillRect(cenL-info.hpW/2+biasX, cenT-info.hpT+biasY, chess._hp/chess.hp*info.hpW, info.hpH)
            ctx.fillStyle = ColorInfo.chessMp
            ctx.fillRect(cenL-info.hpW/2+biasX, cenT-info.mpT+biasY, chess._mp/chess.mp*info.hpW, info.hpH)
            if (chess.status.spell) {
              ctx.fillStyle = ColorInfo.chessSp
              ctx.fillRect(cenL-info.hpW/2+biasX, cenT-info.spT+biasY, chess.status.spell/chess.spell_pre*info.hpW, info.hpH)
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
      if (sch.status === 'prepare') {
        ctx.strokeStyle = '#555'
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.arc(this.w/2, info.t, info.arcR, Math.PI/2-(1-sch.p/sch.pn)*Math.PI*2, Math.PI/2)
        ctx.stroke()
        ctx.lineWidth = 1
      } else if (sch.status === 'setting') {
      } else if (sch.status === 'battle') {
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
  position: relative;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
  text-align: center;
  color: #2c3e50;
}
button {
  outline: none;
  background-color: #EEE;
  border: none;
  padding: .5rem;
  cursor: pointer;
}
input {
  outline: none;
  padding: .5rem;
  border: #ccc 1px solid;
}
.entry {
  height: 100%;
  text-align: left;
  .block {
    display: inline-block;
    width: 25%;
    height: 100%;
    padding-top: 15rem;
    border-right: 1px solid #eee;
    text-align: center;
    button {
      margin-top: 1rem;
    }
  }
}
.show {
  position: fixed;
  padding: 5px;
  width: 10rem;
  height: 6rem;
  font-size: 0.75rem;
  color: #4d373a;
  background-color: #d3cdbf;
}
.attr {
  display: flex;
  flex-wrap: wrap;
  text-align: left;
  div {
    flex: 0 0 auto;
    width: 25%;
  }
}
.buff {
  display: flex;
  flex-wrap: wrap;
  text-align: left;
  font-size: .25rem;
  div {
    flex: 0 0 auto;
    width: 25%;
  }
}
</style>
