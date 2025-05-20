import { useEffect } from 'react'
import './App.css'
import useGameStore from './game/store'

function App() {

  const playerHand = useGameStore((state) => state.playerHand)
  const selectCard = useGameStore((state) => state.selectCard)
  const drawCard = useGameStore((state) => state.drawCard)
  const neutralZone = useGameStore((state) => state.neutralZone)
  const totalAttack = 0

  useEffect(() => {
    if (playerHand.length === 0) {
      drawCard(3)
    }
  }, [])

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center ">

      <div className="flex items-center justify-center gap-2">
        {neutralZone.map((item) => (
          <div key={item.id} className="w-[120px] h-[160px] bg-gray-200 flex flex-col items-center justify-center rounded-md"
            style={{
              cursor:  playerHand.some((item) => item.selected) ? (item.attack > totalAttack ? 'not-allowed' : `url('/attack.png') 16 16, pointer`) : 'normal',
            }}
          >
            <div
              className="text-2xl font-bold"
              style={{
                color:  playerHand.some((item) => item.selected) ? (item.attack > totalAttack ? 'red' : 'green') : 'black',
                
              }}
            >{item.attack}</div>
          </div>
        ))}
      </div>

      <div>
        <div
          className="text-2xl text-right mb-[32px] h-[32px]"
        >
          {playerHand.some((item) => item.selected) && <span>Total Attack: {totalAttack}</span>}
        </div>
        <div className="flex items-center justify-center gap-2">
          {
            (() => {
              // 定义扑克牌点数到数值的映射，用于排序
              // 'A' 通常被认为是最大的牌
              const rankToValue: { [key: string]: number } = {
                '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
              };

              return playerHand
                .slice() // 创建一个副本进行排序，避免直接修改状态
                .sort((a, b) => rankToValue[b.card.rank] - rankToValue[a.card.rank])
                .map((item) => (
                  <div
                    key={item.card.rank + item.card.suit}
                    data-selected={item.selected}
                    className="w-[120px] h-[160px] bg-gray-200 cursor-pointer flex flex-col items-center justify-center rounded-md
                    data-[selected=true]:translate-y-[-30px]
                    transition-all duration-100 ease-in-out
                    "
                    onClick={() => {
                      selectCard(item.card)
                    }}
                  >
                    <div className="text-2xl font-bold">{item.card.rank}</div>
                  </div>
                ));
            })()
          }
        </div>
      </div>
    </div>
  )
}

export default App
