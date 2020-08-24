<script>
export default {
  data () {
    return {
      ip: 'http://localhost:81/',
    }
  },
  methods: {
    async fetch (route, param) {
      let formData = new FormData()
      for (let k in param) {
        formData.append(k, param[k])
      }
      return await fetch(`${this.ip}${route}`, {
        body: formData,
        method: 'POST',
      }).then(res => res.json())
      .then(json => {
        if (json.err) {
          this.dealError(json)
        }
        return json
      })
    },
    dealError (error) {
      this.$bus.$emit('pop', error)
    },
  }
}
</script>