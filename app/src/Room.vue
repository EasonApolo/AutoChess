<script>
export default {
  data () {
    return {
      user: {},
      room: {},
      rooms: [],
      state: 0,
    }
  },
  watch: {
    state (new_val, old_val) {
      if (new_val == 1) {
        if (this.ws.room) {
          this.ws.room.close()
          this.ws.room = undefined
        }
        this.fetchRooms()
      } else if (new_val == 2) {
        if (this.ws.rooms) {
          this.ws.rooms.close()
          this.ws.rooms = undefined
        }
        this.fetchRoom()
      } else if (new_val == 3) {
        this.ws.room.close()
        this.ws.room = undefined
      }
    },
    'room.stage': function (new_val, old_val) {
      // auto start game
      if (new_val == 1 && this.state != 3) {
        this.state = 3
        this.$nextTick(this.initializeGame)
      }
    },
  },
  methods: {
    fetchRooms () {
      this.ws.rooms = new WebSocket(`${ this.ws.ip }room/list`)
      this.ws.rooms.onopen = () => this.ws.rooms.send('immediate')
      this.ws.rooms.onmessage = e => {
        this.rooms = JSON.parse(e.data)
      }
    },
    fetchRoom () {
      this.ws.room = new WebSocket(`${ this.ws.ip }room?rid=${ this.room.id }`)
      this.ws.room.onopen = () => this.ws.room.send('immediate')
      this.ws.room.onmessage = e => {
        this.room = JSON.parse(e.data)
      }
    },
    joinRoom (rid) {
      let param = { rid: rid, uid: this.user.id }
      this.fetch('room/join', param).then(data => {
        this.state = 2
        this.room = data.room
      })
    },
    exitRoom () {
      let param = { uid: this.user.id }
      this.fetch('room/exit', param).then(json => {
        this.rooms = json.rooms
        this.state = 1
      })
    },
    createRoom () {
      let param = { uid: this.user.id }
      this.fetch('room/create', param).then(data => {
        this.state = 2
        this.room = data.room
      })
    },
    startRoom () {
      let param = { rid: this.room.id}
      this.fetch('room/start', param).then(data => {
        this.room = data.room
        this.state = 3
        this.$nextTick(this.initializeGame)
      })
    }
  }
}
</script>