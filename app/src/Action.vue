<script>
export default {
  data () {
    return {
    }
  },
  methods: {
    startRound () {
      this.queue.push(this.checkRemain)
      this.initAllChess()
    },
    actAll () {
      let grid = this.board.grid
      for (let i in grid) {
        for (let j in grid[i]) {
          if (grid[i][j] !== undefined) {
            let chess = grid[i][j]
            if (chess.status.stun) {
              let stun = chess.status.stun
              if (stun.p<stun.pn) {
                stun.p++
              } else {
                chess.status.stun = undefined
              }
            }
            else if (chess.status.ready) {
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
                  this.dealBuff('atk', chess)
                  this.createUtilAttack(chess, chess.status.target)
                  if (chess.mp && chess.mp_ >= chess.mp) {  // 攻击完成后才会施法
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
              if (chess.status.spell == chess.spell_pre){
                chess.spell()
              }
              if (chess.spell_post && chess.status.spell == chess.spell_post) {
                chess.status.spell = undefined
                chess.status.attack = 0
              }
              chess.status.spell ++
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
    moveChessOnce (chess, tgt) {
      let src = chess.pos
      let grids = this.board.grid
      grids[src[0]][src[1]] = undefined
      grids[tgt[0]][tgt[1]] = chess
      chess.pos = tgt
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
        chess.mp_ = 0
      }
    },
    heal (util, tgt) {
      tgt.hp_ += util.val
      if (tgt.hp_ > tgt.hp) tgt.hp_ = tgt.hp
    },
    damage (util, tgt=undefined) {
      if (!tgt) tgt = util.tgt
      let damage = util.damage
      // buffed damage type
      let buff_type = this.dealBuff('util_type', util.src)
      if (buff_type) util.type = buff_type
      // armor, mr, dodge
      if (util.type === 0) {
        if (this.dealBuff('dodge', tgt)) {
          this.game.damageDisplays.push(new DamageDisplay(this, util.type, tgt.pos, 'miss'))
          return
        }
        damage = this.mitigate(tgt.armor) * damage
      } else if (util.type === 1) {
        damage = this.mitigate(tgt.mr) * damage
      }
      // other damage reduction
      damage = this.dealBuff('r_dmg', tgt, damage, util)
      // damage value confirmed, add to display & record
      this.game.damageDisplays.push(new DamageDisplay(this, util.type, tgt.pos, damage))
      this.addDamageToRecord(util, damage)
      // damage on shield
      damage = this.dealBuff('s_dmg', tgt, damage, util)
      // damage on hp
      tgt.hp_ -= damage
      // after hurt damage
      this.dealBuff('dmg', tgt, util.damage, util)  // use pre-mitigated damage
      // check vital status
      if (tgt.hp_ <= 0) {
        tgt.die()
      }
    },
    stun (util, tgt=undefined) {
      if (!tgt) {
        tgt = util.target
      }
      // if still no tgt (tgt already dead or something)
      if (!tgt) return
      // stunning shouldn't stop jump
      tgt.status.stun = {type:util.stun_type,p:0,pn:util.stun}
    },
    addDamageToRecord (util, damage) {
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
    },
    mitigate (n) {
      return 100 / (n + 100)
    },
    dealBuff (type, chess, ...args) {
      if (type === 'dmg') {
        for (let i in chess.buff) {
          chess.buff[i].response(type, ...args)
        }
      } else if (type === 'atk') {
        for (let i in chess.buff) {
          chess.buff[i].response(type)
        }
      } else if (type === 's_dmg' || type === 'r_dmg') {
        let [damage, util] = args
        for (let i in chess.buff) {
          let res = chess.buff[i].response(type, damage, util)
          if (res!==undefined) damage = res
        }
        return damage
      } else if (type === 'util_type') {
        for (let i in chess.buff) {
          let dmg_type = chess.buff[i].response(type)
          if (dmg_type !== undefined) return dmg_type
        }
      } else if (type === 'dodge') {
        if (chess.dodge == 0) {
          return false
        }
        if (randInt(100) < chess.dodge * 100) {
          return true
        } else {
          return false
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
      if (camp0 > 0 && camp1 > 0) return
      removeFromArr(this.queue, this.checkRemain)
      let damage = 0
      // lose
      if (camp0 === 0) {
        damage = camp1 * 2
        if (this.game.hp - damage < 0) {
          this.hp = 0
        } else {
          this.game.hp -= damage
        }
        this.game.combo = this.game.combo >= 0 ? -1 : this.game.combo - 1
      }
      else if (camp1 === 0) {
        this.game.combo = this.game.combo <= 0 ? 1 : this.game.combo + 1
      }
      if (this.game.schedule.status === 'battle') {
        this.game.schedule.p = this.game.schedule.pn
      }
    },
  }
}
</script>