<script>
export default {
  data () {
    return {
      username: '',
      password: '',
      local: {
        users: {},
      },
    }
  },
  methods: {
    validate () {
      if (this.username == '' || this.password == '') {
        this.dealError('empty username or password')
        return true
      }
    },
    login () {
      if (this.validate()) return
      let param = {name: this.username, password: this.password}
      this.fetch('user/login', param).then(data => {
        let user = data.user
        if (user) this.user = user
        this.saveLocalUser(this.username, this.password)
        if (this.user.room != undefined) {
          this.room.id = this.user.room
          this.state = 2
        } else {
          this.state = 1
        }
      })
    },
    signup () {
      if (this.validate()) return
      let param = {name: this.username, password: this.password}
      this.fetch('user/signup', param).then(json => {
        if (json.user) {
          this.dealError('register success! click login.')
        }
      })
    },
    loadLocalUsers () {
      this.local.users = localStorage.users == undefined ? {} : JSON.parse(localStorage.users)
    },
    saveLocalUser (n, p) {
      let users = localStorage.users == undefined ? {} : JSON.parse(localStorage.users)
      // called after login, this.user is assigned
      users[this.user.id] = { username: n, password: p }
      localStorage.users = JSON.stringify(users)
    },
    autoLogin (user) {
      this.username = user.username
      this.password = user.password
      this.login()
    },
  }
}
</script>