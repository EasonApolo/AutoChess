# chess

## Todos

| 任务 | 优先级 | 完成 |
| ---- | ---- | ---- |
| 重连恢复数据 | 高 | √ |
| 棋子合成 | 高 | √ |
| 卖棋子 | 高 | 对 |
| 商店样式改进 | 高 | - |
| 移动端 | 中 | × |
| 装备合成 | 中 | √ |
| 装备掉落 | 低 | × |
| 召唤生物 | 中 | × |
| 降星刀 | 低 | × |
| 飓风 | 低 | × |
| 多人对战 | 高 | - |
| 棋子刷新 | 中 | √ |
| 伤害类型，护甲/魔抗、无敌、闪避、反弹等效果 | 高 | - |
| 回合设置 | 低 | - |
| 伤害指示 | 中 | √ |
| 范围（单次/持续）伤害和（单次）buff | 高 | √ |
| 羁绊buff | 高 | √ |
| 装备buff | 高 | √ |
| 右键事件 | 高 | √ |

## BugReminder

| version | bug描述 | 解决 |
| ---- | ---- | ---- |
| 0.2.0 | 开始游戏后移动时samePos报错 |  |
| 0.0.32 | 可能会和对面的棋子合成了（这也太尴尬了吧） |  |
|  | 无敌（凯尔和剑姬） |  |
|  | 无法攻击（冰女） |  |
|  | 衍生生物（蜘蛛、元素使buff） |  |
|  | 法强（法师、忍者buff） |  |
|  | 跳到目标身旁（雷克赛、狮子狗、机器人、寡妇、派克、杰斯、vi、潘森、卡米尔、刺客buff） |  |
| 0.0.27.1 | 合成时要保留装备 | √ |
|  | 战斗开始加羁绊buff时，似乎此时敌方棋子已经出现，所以务必要区分敌我，敌方棋子没有加buff | √ |
|  | 战斗进行时应该禁止合成，在比赛开始阶段合成 |  |
|  | xbase现在是全局变量，绘图是xbase+getcoord，以前的可以替换 | 更换了getBaseCoord，以前的可以更换 |
|  | 买棋子合成的时候会有棋子留在手上 | 是小屏幕时，商店和手牌重合导致的 |
|  | 买棋子合成的时候要保留装备，多的丢在物品栏里 | √ |
|  | 有时棋子会莫名其妙被判定死亡（消失，不能攻击，位置不变，但别人依然会凭空攻击它） |  |
|  | 新一回合开始时可能会少几个棋子，也许是刷新棋子的时候受到了伤害？ |  |
|  | 目标很多的时候狗熊的buff可能会出错 |  |
| 0.0.23 | 男枪的攻击需要修正 |  |
| 0.0.21.12 | 格雷福斯伤害加成buff |  |
|  | 不同小炮的攻击都会叠加炸弹 |  |
|  | endgame结算 |  |
|  | 有时伤害记录名字不对 |  |
|  | 有时候战斗时会卡住 |  |
| 0.0.21.7 | 奥巴马有时技能位移错误 |  |

## All

| 事项 | 完成 | 事项 | 完成 |
| ---- | ---- | ---- | ---- |
| Aatrox | √ | Ahri | √ |
| Akali |  | Anivia |  |
| Ashe | √ | Aurelion Sol |  |
| Blitzcrank |  | Brand | √ |
| Braum | √ | Chogath | √ |
| Darius | √ | Draven | √ |
| Elise |  | Evelynn |  |
| Fiora |  | Gangplank | √ |
| Garen | √ | Gnar | √ |
| Graves | √ | Karthus | √ |
| Kassadin | √ | Katarina |  |
| Kayle |  | Kennen | √ |
| Khazix | √ | Kindred |  |
| Leona |  | Lissandra |  |
| Lucian | √ | Lulu | √ |
| Miss Fortune |  | Mordekaiser | √ |
| Morgana | √ | Nidalee | √ |
| Poppy | √ | Pyke |  |
| RekSai |  | Rengar | √ |
| Sejuani |  | Shen | √ |
| Shyvana | √ | Swain |  |
| Tristana | √ | Varus | √ |
| Vayne | √ | Veigar | √ |
| Volibear | √ | Warwick | √ |
| Yasuo | √ | Zed |  |
| Twisted Fate |  | Camille |  |
| Jayce |  | Jinx |  |
| Vi |  | Pantheon |  |
| Kaisa | √ |

| 事项 | 完成 | 事项 | 完成 |
| ---- | ---- | ---- | ---- |
| Demon |  | Dragon |  |
| Exile | √ | Glacial |  |
| Hextech |  | Imperial |  |
| Noble | √ | Ninja |  |
| Pirate |  | Phantom |  |
| Robot |  | Void | √ |
| Wild |  | Yordle |  |
| Assasin |  | Blademaster |  |
| Brawler | √ | Elementalist |  |
| Guardian |  | Gunslinger | √ |
| Knight |  | Ranger | √ |
| Shapeshifter |  | Sorcerer |  |

| 事项 | 完成 | 事项 | 完成 |
| ---- | ---- | ---- | ---- |
| B.F. Sword |  | Chain Vest |  |
| Giant's Belt |  | Needlessly Large Rod |  |
| Negatron Cloak |  | Recurve Bow | √ |
| Spatula |  | Tear of the Goddess |  |
| Blade of the Ruined King |  | Bloodthirster |  |
| Cursed Blade |  | Darkin |  |
| Dragon's Claw |  | Force of Nature |  |
| Frozen Heart |  | Frozen Mallet |  |
| Guardian Angel |  | Guinsoo's Rageblade |  |
| Hextech Gunblade |  | Hush |  |
| Infinity Edge |  | Ionic Spark |  |
| Knight's Vow |  | Locket of the Iron Solari |  |
| Luden's Echo |  | Morellonomicon |  |
| Phantom Dancer |  | Rabadon's Deathcap |  |
| Rapid Firecannon |  | Red Buff |  |
| Redemption |  | Runaan's Hurricane |  |
| Seraph's Embrace |  | Spear of Shojin |  |
| Statikk Shiv |  | Sword Breaker |  |
| Sword of the Devine |  | Thornmail |  |
| Titanic Hydra |  | Warmog's Armor |  |
| Youmuu's Ghostblade |  | Yuumi |  |
| Zeke's Herald |  | Zephyr |  |
