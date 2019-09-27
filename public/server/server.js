var express = require('express')
var app = express()
var fs = require('fs')
var multer = require('multer')().single()

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    next()
})
app.use(multer)

var rooms = []
var newRoomId = 1
const MAX_N_PLAYER = 4

getNewRoomId = () => {
    return newRoomId++
}
getEnemyId = (stage, id, len) => {      // stage start from 0
    let tmp = (id+stage)%(len-1)
    if (tmp >= id) tmp++
    return tmp
}
getRoom = (roomid) => {
    for (let i in rooms) {
        if (rooms[i].id == roomid) {    // roomid is parsed from request, usually string, use ==
            return i
        }
    }
    return undefined
}
getUser = (roomid, username) => {
    let i = getRoom(roomid)
    for (let j in rooms[i].users) {
        if (rooms[i].users[j].name === username) {
            return [i, j, rooms[i].users[j]]
        }
    }
    return []
}

app.post('/user/login', (req, res) => {
    let name = req.body.name
    let password = req.body.password
    fs.readFile(__dirname + '/' + 'users.json', (err, data) => {
        data = JSON.parse(data)
        for (let i in data) {
            if (i === name) {
                if (data[i].password === password) {    // login success
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
app.post('/user/signup', (req, res) => {
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

app.post('/room/create', (req, res) => {
    let name = req.body.name
    let room = {id:getNewRoomId(), start: false, stage:0, users:[{'name': name}]}
    rooms.push(room)
    res.end(JSON.stringify(room))
})
app.post('/room/join', (req, res) => {
    let name = req.body.name
    let id = req.body.roomid
    let i = getRoom(id)
    if (!i) res.end(JSON.stringify({'error': 'room not exist'}))
    if (rooms[i].users.length < MAX_N_PLAYER) {
        rooms[i].users.push({'name': name})
        res.end(JSON.stringify(rooms[i]))
    }
    res.end(JSON.stringify({'error': 'room not available'}))
})
app.post('/room/exit', (req, res) => {
    let name = req.body.name
    let id = req.body.roomid
    let [i, j, _] = getUser(id, name)
    if (i) {
        rooms[i].users.splice(j, 1)
        if (rooms[i].users.length <= 0) {
            rooms.splice(i, 1)
        }
        res.end(JSON.stringify(rooms))
    }
})
app.post('/room/start', (req, res) => {
    let id = req.body.roomid
    let i = getRoom(id)
    if (i) {
        rooms[i].start = true
        rooms[i].users.map(v => {
            v.hp = 100
        })
        res.end(JSON.stringify(rooms))
    }
})
app.get('/room/list', (req, res) => {
    res.end(JSON.stringify(rooms))
})

app.post('/room', (req, res) => {
    let id = req.body.roomid
    let i = getRoom(id)
    if (i) {
        res.end(JSON.stringify(rooms[i]))
    }
})

app.post('/data/start', (req, res) => {
    let id = req.body.roomid
    let name = req.body.name
    let data = req.body.data
    let [i, j, _] = getUser(id, name)
    if (i) {
        rooms[i].users[j].data = data
        let enemyId = getEnemyId(rooms[i].stage, j, rooms[i].users.length)
        new Promise(resolve => {
            let intervalID = setInterval(() => {
                let flag = true
                for (let k in rooms[i].users) {
                    if (!rooms[i].users[k].data) {
                        flag=false;break;
                    }
                }
                if (flag) {
                    clearInterval(intervalID)
                    resolve()
                }
            }, 100)
        }).then(() => res.end(JSON.stringify(rooms[i].users[enemyId])))
    }
})
app.post('/data/end', (req, res) => {
    let id = req.body.roomid
    let name = req.body.name
    let hp = req.body.hp
    let [i, j, _] = getUser(id, name)
    if (i) {
        rooms[i].users[j].hp = hp
        rooms[i].users[j].end=true
        let stage = rooms[i].stage
        let userdata = JSON.stringify(rooms[i].users[j])
        new Promise(resolve => {
            let intervalID = setInterval(() => {
                if (rooms[i].stage != stage) resolve()
                if (rooms[i].users.findIndex(v => !v.end) < 0) {
                    rooms[i].stage ++
                    for (let k in rooms[i].users) {
                        rooms[i].users[k].end = false
                        rooms[i].users[k].data = undefined
                    }
                    clearInterval(intervalID)
                    resolve()
                }
            }, 100)
        }).then(() => res.end(userdata))
    }
})

var server = app.listen(80, () => {
    var host = server.address().address
    var port = server.address().port
    console.log('server running at %s:%s', host, port)
})