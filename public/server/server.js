var express = require('express')
var app = express()
var fs = require('fs')
var multer = require('multer')().single()

var rooms = []
var roomid = 0

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    next()
})
app.use(multer)

app.post('/users/login', (req, res) => {
    let name = req.body.name
    let password = req.body.password
    fs.readFile(__dirname + '/' + 'users.json', (err, data) => {
        data = JSON.parse(data)
        for (let i in data) {
            if (i === name) {
                if (data[i].password === password) {
                    // login success
                    for (let i in rooms) {
                        for (let j in rooms[i].users) {
                            if (rooms[i].users[j].name === name) {
                                res.end(JSON.stringify(rooms[i]))
                            }
                        }
                    }
                    res.end(JSON.stringify({}))
                }
                else {
                    res.end(JSON.stringify({'error': 'password'}))
                }
            }
        }
        res.end(JSON.stringify({'error': 'no user'}))
    })
})
app.post('/users/signup', (req, res) => {
    let name = req.body.name
    let password = req.body.password
    fs.readFile(__dirname + '/' + 'users.json', (err, data) => {
        data = JSON.parse(data)
        let cnt = 0
        for (let i in data) {
            if (i === name) {
                res.end(JSON.stringify({'error': 'username exist'}))
            }
            cnt++
        }
        data[name] = {'password': password, 'id': cnt}
        fs.writeFile(__dirname + '/' + 'users.json', JSON.stringify(data), (err) => {
            if (err) throw err
            res.end(JSON.stringify(data[name]))
        })
    })
})
app.post('/rooms/join', (req, res) => {
    let name = req.body.name
    let id = req.body.roomid
    for (let i in rooms) {
        if (rooms[i].id == id) {
            if (rooms[i].users.length < 2) {
                rooms[i].users.push({'name': name})
                res.end(JSON.stringify(rooms[i]))
            }
            res.end(JSON.stringify({'error': 'room not available'}))
        }
    }
    res.end(JSON.stringify({'error': 'room not exist'}))
})
app.post('/rooms/create', (req, res) => {
    let name = req.body.name
    let room = {'id':roomid, 'start': false, 'stage':0, users:[{'name': name}]}
    roomid += 1
    rooms.push(room)
    res.end(JSON.stringify(room))
})
app.post('/rooms/exit', (req, res) => {
    let name = req.body.name
    let id = req.body.roomid
    for (let i in rooms) {
        if (rooms[i].id == id) {
            for (let j in rooms[i].users) {
                if (rooms[i].users[j].name === name) {
                    rooms[i].users.splice(j, 1)
                }
                if (rooms[i].users.length <= 0) {
                    rooms.splice(i, 1)
                }
                res.end(JSON.stringify(rooms))
            }
        }
    }
})
app.post('/rooms/start', (req, res) => {
    let id = req.body.roomid
    for (let i in rooms) {
        if (rooms[i].id == id) {
            rooms[i].start = true
            res.end(JSON.stringify(rooms))
        }
    }
})
app.post('/room', (req, res) => {
    let id = req.body.roomid
    for (let i in rooms) {
        if (rooms[i].id == id) {
            res.end(JSON.stringify(rooms[i]))
        }
    }
})
app.get('/rooms/list', (req, res) => {
    res.end(JSON.stringify(rooms))
})
app.post('/data/upload', (req, res) => {
    let id = req.body.roomid
    let name = req.body.name
    let data = req.body.data
    for (let i in rooms) {
        if (rooms[i].id == id) {
            for (let j in rooms[i].users) {
                if (rooms[i].users[j].name === name) {
                    rooms[i].users[j].data = data
                    res.end(JSON.stringify(rooms[i]))
                }
            }
        }
    }
})
app.post('/data/get', (req, res) => {
    let id = req.body.roomid
    let name = req.body.name
    for (let i in rooms) {
        if (rooms[i].id == id) {
            for (let j in rooms[i].users) {
                if (rooms[i].users[j].name === name) {
                    let data = rooms[i].users[1-j].data
                    console.log(rooms[i].users)
                    res.end(JSON.stringify(data))
                }
            }
        }
    }
})

var server = app.listen(80, () => {
    var host = server.address().address
    var port = server.address().port
    console.log('server running at %s:%s', host, port)
})