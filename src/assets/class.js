import { buff_class_gun, buff, buff_val, buff_class_void, buff_class_noble, buff_shield } from "./chess";
import { randInt } from "./helper";

export default [
  {name: "枪手", stage: [2,4,6], buff: set_buff_class_gun},
  {name: "约德尔人", stage: [3, 6]},
  {name: "贵族", stage: [3, 6], buff: set_buff_class_noble},  //2
  {name: "剑士", stage: [3, 6, 9]},
  {name: "浪人", stage: [1], exact: 0, buff: set_buff_class_exile},
  {name: "海盗", stage: [3]},   //5
  {name: "恶魔", stage: [2,4,6]}, //6
  {name: "虚空", stage: [2,4], buff: set_buff_class_void},
  {name: "斗士", stage: [2,4,6]}, //8
  {name: "法师", stage: [3,6,9]}, //9
  {name: "游侠", stage: [2,4]}, //10
  {name: "极地", stage: [2,4,6]}, //11
  {name: "骑士", stage: [2,4,6]}, //12
]

export function set_buff_class_gun (vm, camp, stage) {
  let grids = vm.board.grid
  for (let r in grids) {
    for (let c in grids) {
      if (grids[r][c] && grids[r][c].camp === camp && grids[r][c].cat.includes(0)) {
        grids[r][c].buff.push(new buff_class_gun(vm, grids[r][c], stage))
      }
    }
  }
}

export function set_buff_class_void (vm, camp, stage) {
  let grids = vm.board.grid
  let poses = []
  for (let r in grids) {
    for (let c in grids[r]) {
      if (grids[r][c] && grids[r][c].camp === camp && grids[r][c].cat.includes(7)) {
        if (stage == 1) {
          grids[r][c].buff.push(new buff_class_void(vm, grids[r][c]))
        } else if (stage == 0) {
          poses.push([r,c]) 
        }
      }
    }
  }
  if (stage == 0) {
    let pos = poses[randInt(poses.length)]
    grids[pos[0]][pos[1]].buff.push(new buff_class_void(vm, grids[pos[0]][pos[1]]))
  }
}

export function set_buff_class_noble (vm, camp, stage) {
  let grids = vm.board.grid
  let poses = []
  for (let r in grids) {
    for (let c in grids[r]) {
      if (grids[r][c] && grids[r][c].camp === camp && grids[r][c].cat.includes(7)) {
        if (stage == 1) {
          grids[r][c].buff.push(new buff_val(vm, grids[r][c], 'armor', 50, 0, '贵族_护甲'))
          grids[r][c].buff.push(new buff_val(vm, grids[r][c], 'mr', 50, 0, '贵族_魔抗'))
          grids[r][c].buff.push(new buff_class_noble(vm, grids[r][c]))
        } else if (stage == 0) {
          poses.push([r,c]) 
        }
      }
    }
  }
  if (stage == 0) {
    let pos = poses[randInt(poses.length)]
    grids[r][c].buff.push(new buff_val(vm, grids[r][c], 'armor', 50, 0, '贵族_护甲'))
    grids[r][c].buff.push(new buff_val(vm, grids[r][c], 'mr', 50, 0, '贵族_魔抗'))
    grids[pos[0]][pos[1]].buff.push(new buff_class_noble(vm, grids[r][c]))
  }
}

export function set_buff_class_exile (vm, camp, stage) {
  let grids = vm.board.grid
  for (let r in grids) {
    for (let c in grids[r]) {
      let chess = grids[r][c]
      if (chess && chess.cat.includes(4)) {
        let six = vm.getSixPos([r,c])
        if (undefined === six.find(v => grids[v[0]][v[1]] !== undefined && grids[v[0]][v[1]].camp === chess.camp)) {
          grids[r][c].buff.push(new buff_shield(vm, chess, chess.hp, 100*60))
        }
      }
    }
  }
}