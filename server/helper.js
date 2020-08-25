/*
    global helper functions
*/
module.exports = {
  wsSend (ws) {
    return function (json) {
        ws.send(JSON.stringify(json))
    }
  },
  randInt (n, b=0) {
    return Math.floor(Math.random()*n)+b
  },
  log (...args) {
    console.log(...args)
  },
  json (json, res=undefined) {
    let data = JSON.stringify(json)
    if (res) res.end(data)
    else this.end(data)
  },
}