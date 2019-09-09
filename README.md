# chess

## Notes

Chess initialization (add status ready, set _hp) is done in initAllChess() which is called at the round start rather than setChess(), since the game is designed that no more chess setting after round start. Therefore, chesses been set after round start cannot attack or do not have _hp.

## Todos

| 棋子合成 |
| 棋子刷新 |
| 装备合成 |
| 装备掉落 |
| 装备buff |
| 羁绊buff |
| 范围（单次/持续）伤害和（单次）buff |
| 伤害类型，护甲/魔抗、无敌、闪避、反弹等效果 |
| 回合设置 |
| 多人对战 |

## BugReminder

状态判定应该在 ++ 前面，避免显示上状态未满就结束了。