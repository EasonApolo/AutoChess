<script>
import PosInfo from './assets/position'
import { randInt, removeFromArr, numberize, findArr } from './assets/helper'
import { util_tgt, util_attack} from './assets/util'

export default {
  data () {
    return {
    }
  },
  methods: {
    /*
      game inline functions
      */
    getFurthestGrid (r, c) {
      let orient = this.getBackOrient(r, c)
      let order = [0, -1, 1, -2, 2, -3]
      for (let i=0; i<6; i++) {
        let testOrient = (orient+6+order[i]) % 6
        let tgt = this.getOrientGrid([r,c], testOrient)
        if (tgt && this.board.grid[tgt[0]][tgt[1]] === undefined) return [tgt, (orient+3)%6]
      }
    },
    getPosByCoord (x, y) {
      let info = PosInfo.board
      if (x>this.w/2-info.w/2 && x<this.w/2+info.w/2 && y>0 && y<info.h) {
        // x,y relative position to board centre
        let rx = x-this.w/2
        let ry = y-(info.h/2)
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
    // orient start: top-left 0
    getOrient (r1,c1, r2,c2) {
      [r1, c1, r2, c2] = numberize([r1, c1, r2, c2])
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
    getApproxOrient(r1, c1, r2, c2) {
      [r1, c1, r2, c2] = numberize([r1, c1, r2, c2])
      if (r1===r2) {
        return c1<c2?2:5
      } else {
        if (r1%2==1) {
          if (r2<r1) {
            return c1<=c2?0:1
          } else {
            return c1>=c2?4:3
          }
        } else {
          if (r2<r1) {
            return c1>=c2?1:0
          } else {
            return c1<=c2?3:4
          }
        }
      }
    },
    getOrientGrid (now, orient) {
      now = numberize(now)
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
    getBackOrient (r, c) {
      [r, c] = numberize([r, c])
      let orient = undefined
      if (r <= 1) {
        if (c <= 3) orient = 0
        else orient = 1
      } else if (r >= 2 && r <= 3) {
        if (c <= 3) orient = 5
        else orient = 2
      } else if (r >= 4) {
        if (c <= 3) orient = 4
        else orient = 3
      }
      return orient
    },
    getBasedCoord(r, c) {
      let [x, y] = this.getCoord(r, c)
      x += this.xbase, y += this.ybase
      return [x, y]
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
            if (grid[i][j].camp !== chess.camp && !grid[i][j].untargetable) {
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
    createUtilAttack (src, tgt) {
      let u = new util_attack(this, src, tgt)
    },
  }
}
</script>