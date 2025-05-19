import './App.css'
import useGameStore from './game/store'

function App() {

  const playerHand = useGameStore((state) => state.playerHand)
  const selectCard = useGameStore((state) => state.selectCard)
  const neutralZone = useGameStore((state) => state.neutralZone)
  const totalAttack = playerHand.filter((item) => item.selected).reduce((acc, item) => acc + item.card.attack, 0)

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
            playerHand.map((item) => (
              <div
                key={item.card.id}
                data-selected={item.selected}
                className="w-[120px] h-[160px] bg-gray-200 cursor-pointer flex flex-col items-center justify-center rounded-md
                data-[selected=true]:translate-y-[-30px]
                transition-all duration-100 ease-in-out
                "
                onClick={() => {
                  selectCard(item.card)
                }}
              >
                <div className="text-2xl font-bold">{item.card.attack}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

export default App
