var express = require('express')
var app = express()
var expressWs = require('express-ws')(app);
var fs = require('fs').promises
var multer = require('multer')().single()


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    next()
})
app.use(multer)

const MAX_N_PLAYER = 4

var rooms = []
var newRoomId = 1
var users = []

/*
    helper functions
*/
json = function (json, res=undefined) {
    let data = JSON.stringify(json)
    if (res) res.end(data)
    else this.end(data)
}
async function readUserInfo () {
    let userInfo
    try {
        userInfo = await fs.readFile(`./users.json`, 'utf-8')
        userInfo = JSON.parse(userInfo)
    } catch (err) {
        console.log(err)
    } finally {
        return userInfo
    }
}
getNewRoomId = () => {
    return newRoomId++
}
getEnemyId = (stage, id, len) => {      // stage start from 0
    let tmp = (id+stage)%(len-1)
    if (tmp >= id) tmp++
    return tmp
}
getRoom = rid => {
    return rooms.find(r => r.id == rid)
}
getUser = (rid, uid) => {
    let room = getRoom(rid)
    return room.ps.find(p => p.id == uid)
}

/*
    immediately execute
    */
readUserInfo().then(userInfo => {
    users = userInfo
    console.log(users)
    console.log(`loading userInfo OK with ${users.length} users`)
})

/*
    login
*/
app.post('/user/login', (req, res) => {
    let {name, password} = req.body
    let echo = json.bind(res)
    let user = users.find(v => v.name == name && v.password == password)
    if (user) {
        user.online = true
        if (user.room) {
            echo({room: user.room})
        } else {
            echo({rooms: rooms})
        }
    } else {
        echo({err: 'invalid name or password'})
    }
})
app.post('/user/signup', (req, res) => {
    let {name, password} = req.body
    let echo = json.bind(res)
    if (users.find(v => v.name == name)) {
        echo({err: 'username duplicated'})
    } else {
        let lastId = users.slice(-1).id
        let id = lastId == undefined ? 0 : lastId++
        let newUser = {name: name, id: id, password: password}
        console.log(`signup user: `, newUser)
        users.push(newUser)
        echo({user: newUser})
    }
})

/*
    room
*/
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

/*
    game
*/
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

var server = app.listen(81, () => {
    var host = server.address().address
    var port = server.address().port
    console.log('server running at %s:%s', host, port)
})