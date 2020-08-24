<template>
  <v-snackbar
    v-model="snackbar"
    :timeout="timeout"
  >
    {{ text }}
    <v-btn
      color="blue"
      text
      @click="snackbar = false"
    >
      Close
    </v-btn>
  </v-snackbar>
</template>

<script>
export default {
  name: 'pop',
  data () {
    return {
      text: '',
      snackbar: false,
      timeout: 2000,
    }
  },
  created () {
    this.$bus.$on('pop', this.handler)
  },
  methods: {
    handler: function (text) {
      this.text = text
      this.snackbar = true
    }
  }
}
</script>

<style lang="scss" scoped>
.pop {
  position: fixed;
  display: block;
  top: 0;
  left: 0;
  right: 100%;
  padding: .125rem 0;
  z-index: 1;
  font-size: .875rem;
  overflow: hidden;
  background-color: #f1f1ff;
}
.show {
  display: block;
}
</style>