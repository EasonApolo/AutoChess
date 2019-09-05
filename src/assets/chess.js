export default [
    {
        id: 0,
        name: '麦林炮手',
        size: 1,
        cat: [0, 1],
        src: 'Tristana_d.png',
        hp: 550,
        mp: 100,
        ad: 1,
        as: 0.7,
        sp: 75,
        range: 4,
        util: {
            sp: 800,
        },
        buff: [
            regainMana,
        ]
    },
    {
        id: 1,
        name: '圣枪游侠',
        size: 1,
        cat: [0, 2],
        src: 'Obama_d.png',
        hp: 550,
        mp: 100,
        ad: 2,
        as: 0.65,
        range: 3,
        sp: 60,
        util: {
            sp: 1000,
        },
        buff: [
            regainMana,
        ]
    }
]
export function regainMana (type, ...args) {
    if (['damage', 'attack'].includes(type)) {
        // val
        if (type === 'damage') {
            let val = args[0]
            let util = args[1]
            let regain = val * 0.1
            this._mp += regain
        } else if (type === 'attack') {
            this._mp += randInt(5, 6)
        }
    }
}
export function randInt (r, s=0) {
    return Math.floor(Math.random()*r)+s
}