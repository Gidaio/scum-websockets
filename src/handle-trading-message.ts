import { ServerState } from "./server-state"
import { User } from "./user"


export function handleTradingMessage(user: User, message: ClientToServerMessage, serverState: ServerState): void {
  switch (message.type) {
    case "sendCards": {
      if (!serverState.waitingOnTrades.includes(user.username)) {
        user.send({
          type: "badRequest",
          error: "Not waiting on a trade from you!"
        })

        break
      }

      if (user.position === "king" && message.cards.length !== 2) {
        user.send({
          type: "badRequest",
          error: "As king, you must send exactly two cards."
        })

        break
      }

      if (user.position === "queen" && message.cards.length !== 1) {
        user.send({
          type: "badRequest",
          error: "As queen, you must send exactly one card."
        })

        break
      }

      if (!user.removeCards(message.cards)) {
        break
      }

      serverState.waitingOnTrades = serverState.waitingOnTrades.filter(username => username !== user.username)

      if (user.position === "king") {
        const scum = serverState.users.find(user => user.position === "scum")!
        scum.hand.push(...message.cards)
        scum.send({
          type: "cardsReceived",
          player: user.username,
          cards: message.cards
        })
        user.send({
          type: "cardsSent",
          player: scum.username,
          cards: message.cards
        })
      }

      if (user.position === "queen") {
        const viceScum = serverState.users.find(user => user.position === "vice-scum")!
        viceScum.hand.push(...message.cards)
        viceScum.send({
          type: "cardsReceived",
          player: user.username,
          cards: message.cards
        })
        user.send({
          type: "cardsSent",
          player: viceScum.username,
          cards: message.cards
        })
      }

      serverState.sendGameState("gameStateChange")

      if (serverState.waitingOnTrades.length === 0) {
        setTimeout(beginHand, 2000)
      }

      break
    }
  }


  function beginHand() {
    serverState.status = "playing"
    serverState.broadcast({ type: "handBegin" })
  }
}

