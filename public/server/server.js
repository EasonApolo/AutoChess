var express = require('express')
var app = express()
var fs = require('fs')
var multer = require('multer')().single()

var rooms = []

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    next()
})
app.use(multer)

app.post('/rooms/join', (req, res) => {
    let name = req.body.name
    let id = req.body.roomid
    if (rooms[id].users.length === 1) {
        rooms[id].users.push({'name':req.body.name,'board':undefined})
    }
    res.end(JSON.stringify(rooms))
})
app.post('/rooms/create', (req, res) => {
    rooms.push({'id':rooms.length, 'stage':0, users:[{'name':req.body.name,'board':undefined}]})
    res.end(JSON.stringify(rooms))
})
app.get('/rooms/list', (req, res) => {
    res.end(JSON.stringify(rooms))
})
// app.get('/', (req, res) => {
//     fs.readFile(__dirname + '/' + 'users.json', (err, data) => {
//         res.end(data)
//     })
// })

var server = app.listen(80, () => {
    var host = server.address().address
    var port = server.address().port
    console.log('server running at %s:%s', host, port)
})