<template>
  <v-app>
    <pop></pop>

    <v-card class='mt-8 py-4 px-8 mx-auto' v-if="state == 0" width='25rem'>
      <v-text-field v-model='username' hide-details label='username' required></v-text-field>
      <v-text-field v-model='password' hide-details label='password' required></v-text-field>
      <div class='my-4'>
        <v-avatar class='mr-2' color="indigo" size="36" v-for='(u, id) in local.users' :key='id' @click='autoLogin(u)' style='cursor:pointer'>
          <span class="white--text">{{u.username}}</span>
        </v-avatar>
      </div>
      <v-btn block class='mb-4' @click='login' color='primary'>登录</v-btn>
      <v-btn block class='mb-4' @click='signup'>注册</v-btn>
    </v-card>

    <v-card class='mt-8 pa-4 mx-auto' width='50rem' v-else-if="state == 1">
      <div><span>{{user.name}}</span></div>
      <v-divider class="my-4"></v-divider>
      <div>
        <v-btn @click='createRoom' color='primary'>创建房间</v-btn>
      </div>
      <v-divider class="my-4"></v-divider>
      <v-list>
        <v-list-item-group color="primary">
          <v-list-item class='item' v-if='rooms.length == 0'>还没有房间，创建一个吧！</v-list-item>
          <v-list-item class='item' v-for="r in rooms" :key='r.id' :class='{disable:r.users.length>=2}' @click='joinRoom(r.id)'>
            <v-chip class='mr-2' v-for='u in r.users' :key='u.id'>{{u.name}}</v-chip>
            <span>{{r.users.length}}/4</span>
            <span v-if='r.stage==0'>准备中</span>
            <span v-else>比赛中</span>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-card>

    <v-card class='mt-8 pa-4 mx-auto' width='50rem' v-else-if="state == 2">
      <div>
        <v-btn class='mr-4' color='primary' @click='startRoom' :disabled='room.users && room.users.length < 2'>开始</v-btn>
        <v-btn @click='exitRoom'>退出</v-btn>
      </div>
      <v-divider class="my-4"></v-divider>
      <v-list>
        <v-list-item-group color="primary">
          <v-list-item class='item' v-for="u in room.users" :key='u.id'>
            {{u.name}}
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-card>

    <div v-else-if='state == 3' class='game' style='position:relative'>
      <v-chip class="mx-auto" style='position:absolute;left:0;right:0;top:.5rem;width:6rem' color="primary" text-color="white">
        <v-avatar left class="primary darken-2">{{game.time}}</v-avatar>{{stageName}}
      </v-chip>

      <v-card class='mx-auto' style='position:absolute;top:3rem;left:0;right:0' width='750px' height='550px' ref='container'>
        <canvas ref='canvas' style='width:100%;height:100%' :width='w' :height='h' @click='clickBoard'></canvas>
      </v-card>

      <!-- store -->
      <v-card class='d-flex mx-auto pa-2 ' width='39.5rem' style='position:absolute;top:45.375rem;left:0;right:0'>
        <div>
          <v-btn small class='d-block mb-1' width='6rem' color='secondary' @click='deal'>deal</v-btn>
          <v-btn small class='d-block' width='6rem'>level{{game.lvl}}</v-btn>
          <div class='mt-1'>
            <v-chip class='mr-1' color='yellow darken-4' text-color='white' small>{{this.game.gold}}</v-chip>
            <v-chip color='red darken-4' text-color='white' small>{{this.game.exp}}</v-chip>
          </div>
        </div>
        <v-card class='ml-2' width='6rem' v-for='(c, index) in store.cards' :key='index' @click='buyCard(index)'>
          <img v-if='c.src' class='d-block' width='100%' :src='c.src'>
          <v-sheet v-else width='100%' height='6rem'></v-sheet>
        </v-card>
      </v-card>

      <!-- hand -->
      <v-card class='d-flex mx-auto pa-2 pl-0 justify-space-around' width='59rem' style='position:absolute;top:37.875rem;left:0;right:0'>
        <v-card class='ml-2' width='6rem' v-for='(c, index) in hand.cards' :key='index' @click='clickHand(c, index)'>
          <img v-if='c.src' class='d-block' width='100%' :src='c.src'>
          <v-sheet v-else width='100%' height='6rem'></v-sheet>
          <div v-if='c.equips' class='d-flex' style='position:absolute;bottom:0;left:0'>
            <img class='d-block' width='24rem' v-for="(e, idx) in c.equips" :key='idx' :src='e.src'>
          </div>
        </v-card>
      </v-card>

      <!-- equip -->
      <v-card class='d-flex pa-2 pb-0 mx-auto flex-wrap justify-space-between' style='position:absolute;top:26.375rem;left:.5rem;width:11rem;'>
        <v-card class='mb-2' width='3rem' v-for='(e, index) in equips' :key='index' @click='clickEquip(e, index)'>
          <img v-if='e.src' class='d-block' width='100%' :src='e.src'>
          <v-sheet v-else width='100%' height='3rem'></v-sheet>
        </v-card>
      </v-card>

      <!-- hold -->
      <v-card v-if='hold' style='position:absolute;pointer-events:none;z-index:1' :style='{left:holdX,top:holdY,width:holdWidth}'>
        <img class='d-block' width='100%' :src='hold.src'>
      </v-card>

      <!-- sell -->
      <v-card v-if='showSell' @click='sellHoldChess' class='d-flex justify-space-around' color='grey' style='position:absolute;right:1rem;bottom:1rem;width:6rem;height:6rem'>
        <v-icon>mdi-delete-restore</v-icon>
      </v-card>

      <v-card class='show' v-if='showChess!==undefined' :style='{left:showPos[0],top:showPos[1]}'>
        {{showChess.name}}
        <div class='attr'>
          <div>hp:</div><div>{{(showChess.hp_||0).toFixed(0)}}/{{showChess.hp.toFixed(0)}}</div>
          <div>mp:</div><div><span v-if='showChess.mp'>{{(showChess.mp_||0).toFixed(0)}}/{{showChess.mp.toFixed(0)}}</span></div>
          <div>ad:</div><div>{{showChess.ad.toFixed(0)}}</div>
          <div>as:</div><div>{{showChess.as.toFixed(2)}}</div>
          <div>range:</div><div>{{showChess.range.toFixed(0)}}</div>
          <div>armor:</div><div>{{showChess.armor.toFixed(0)}}</div>
          <div>mr:</div><div>{{showChess.mr.toFixed(0)}}</div>
        </div>
        <div class='buff'>
          <div v-for='(buff, index) in showChess.buff' :key='index'>
            {{buff.name}}
          </div>
        </div>
      </v-card>

      <div v-for='src in allsrc' :key='src' style='display:none'>
        <img :src='src'>
      </div>
    </div>
  </v-app>
</template>

<script>
import Pop from './Pop'
import CardInfo from './assets/card'
import ClassInfo from './assets/class'
import PosInfo from './assets/position'
import ChessInfo, { chess, buff_regainMana } from './assets/chess'
import ColorInfo from './assets/color'
import { setTimeout } from 'timers'
import { util_tgt, util_attack} from './assets/util'
import { randInt, removeFromArr, numberize, findArr } from './assets/helper'
import EquipInfo, { equip, merge_map } from './assets/equip'
import { schedule, upgradeExp } from './assets/script'
import { DamageDisplay } from './assets/damageDisplay'
import login from '@/Login.vue'
import room from '@/Room.vue'
import sync from '@/Sync.vue'
import click from '@/Click.vue'
import compute from '@/Compute.vue'
import helper from '@/Helper.vue'
import action from '@/Action.vue'
import logic from '@/Logic.vue'
import draw from '@/Draw.vue'
import showChessInfo from '@/ShowChessInfo.vue'

export default {
  name: 'app',
  components: { Pop },
  mixins: [login, room, click, sync, compute, action, helper, logic, draw, showChessInfo],
  data () {
    return {
      fetchID: undefined,
      w: 0,
      h: 0,
      xbase: 0,
      ybase: 0,
      mouse: {x:undefined, y:undefined},  // this coordinate is doubled
      game: {
        turn: undefined,
        stage: undefined,
        stage0Time: 15,
        time: 0,
        gold: 10,
        exp: 0,
        lvl: 1,
        costUpgrade: 4,
        costRedeal: 2,
        damageRecord: [],
        damageDisplays: [],
        grave: [],
        classes: {},
        schedule: {},
        hp: 100,
        enemy: undefined,
        combo: 0,
      },
      hold: undefined,
      board: {
        grid: undefined,
      },
      store: {
        cards: new Array(5).fill(new Object())
      },
      hand: {
        cards: new Array(9).fill(new Object())
      },
      equips: new Array(9).fill(new Object()),
      allsrc: [],
      queue: [],
      util: [],
      // ip: 'http://47.106.171.107:80/',
    }
  },
  created () {
    document.addEventListener('mousemove', e => {
      this.mouse.x = e.pageX
      this.mouse.y = e.pageY
    })
    this.initBoard()
  },
  mounted () {
    this.loadLocalUsers()
  },
  computed: {
  },
  watch: {
  },
  methods: {
    getUserIndex (name) {
      return this.room.users.findIndex(v => v.name === name)
    },
    getEnemyIndex () {
      return this.getUserIndex(this.game.enemy.name)
    },
    getMeIndex () {
      return this.getUserIndex(this.username)
    },
    /*
      game main thread
      */
    initBoard () {
      let tmp = new Array(6).fill(undefined)
      this.board.grid = tmp.map(v => new Array(7).fill(undefined))
    },
    initializeGame () {
      // init board
      this.w = this.$refs.canvas.offsetWidth * 2
      this.h = this.$refs.canvas.offsetHeight * 2
      // init size data
      let info = PosInfo.board
      this.xbase = this.w/2-6.5*info.ratio*info.w1,
      this.ybase = info.h/2-3.75*info.w1
      // init ctx
      this.ctx = this.$refs.canvas.getContext('2d')
      // start main thread
      this.main()
      this.wsCard()
      this.wsGold()
      this.wsChess()
      this.wsExp()
      this.wsGame()
      this.queue.push(this.actAll)
      this.equips[0] = new EquipInfo[0]()
      this.equips[1] = new EquipInfo[0]()
      this.equips[2] = new EquipInfo[1]()
      this.equips[3] = new EquipInfo[1]()
    },
    main () {
      this.clearAll()
      this.drawBoard()
      this.drawUtil()
      this.drawDamageDisplay()
      for (let i in this.queue) {
        this.queue[i]()
      }
      this.schedule()
      window.requestAnimationFrame(this.main)
    },
    schedule () {
      let s = this.game.schedule
      let grids = this.board.grid
      let OK = false // flag for transimission done
      // preparing stage
      if (s.status === 'prepare') {
        if (s.p === 0) {
          // this.fetchGameStatus()
        }
        else if (s.p < s.pn) {
        }
        else if (s.p === s.pn) {
          // collect data and upload to server
          this.game.clickBoard = false
          let data = {grids:[], hand: [], equip: []}
          for (let r in grids) {
            for (let c in grids[r]) {
              if (grids[r][c]) {
                let d = {pos:[r,c], id:grids[r][c].id, lvl: grids[r][c].lvl}
                if (grids[r][c].equips) {
                  d.equip = []
                  for (let i in grids[r][c].equips) {
                    d.equip.push(grids[r][c].equips[i].id)
                  }
                }
                data.grids.push(d)
              }
            }
          }
          for (let i in this.hand.cards) {
            if (this.hand[i] !== undefined) {
              data.hand.push(this.hand[i].id)
            }
          }
          for (let i in this.equips) {
            if (this.equips[i] !== undefined) {
              data.equip.push(this.equips[i].id)
            }
          }
          let param = {roomid: this.room.id, name: this.username, data: JSON.stringify(data)}
          // this.fetch('data/start', param).then(json => {
          //   this.setChessByData(JSON.parse(json.data), 1)
          //   this.game.enemy = json
          //   this.game.damageRecord = []
          //   this.game.schedule = {status: 'battle', p: 0, pn: 100000}
          //   this.startRound()
          // })
        }
        else if (s.p > s.pn) {
        }
        s.p ++
      } else if (s.status === 'battle') {
        if (s.p == s.pn) {
          let param = {roomid: this.room.id, name: this.username, hp: this.game.hp}
          this.fetch('data/end', param).then(json => {
            this.initBoard()
            this.setChessByData(JSON.parse(json.data), 0)
            this.game.schedule = {status: 'prepare', p: 0, pn: schedule.prepare.time}
            this.game.clickBoard = true
          })
        } else if (s.p > 1) {
        }
        s.p++
      } else {
        this.game.schedule = {status: 'prepare', p: 0, pn: schedule.prepare.time}
      }
    },
  }
}
</script>

<style lang="scss">
.game {
  height: 100%;
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
