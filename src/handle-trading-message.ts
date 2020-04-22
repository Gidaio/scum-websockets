import { ServerState, broadcast, sendGameState } from "./server-state"
import { User, removeCards, send } from "./user"


export function handleTradingMessage(user: User, message: ClientToServerMessage, serverState: ServerState): void {
  switch (message.type) {
    case "sendCards": {
      if (!serverState.waitingOnTrades.includes(user.username)) {
        send(user, {
          type: "badRequest",
          error: "Not waiting on a trade from you!"
        })

        break
      }

      if (user.position === "king" && message.cards.length !== 2) {
        send(user, {
          type: "badRequest",
          error: "As king, you must send exactly two cards."
        })

        break
      }

      if (user.position === "queen" && message.cards.length !== 1) {
        send(user, {
          type: "badRequest",
          error: "As queen, you must send exactly one card."
        })

        break
      }

      if (!removeCards(user, message.cards)) {
        break
      }

      serverState.waitingOnTrades = serverState.waitingOnTrades.filter(username => username !== user.username)

      if (user.position === "king") {
        const scum = serverState.users.find(user => user.position === "scum")!
        scum.hand.push(...message.cards)
        send(scum, {
          type: "cardsReceived",
          player: user.username,
          cards: message.cards
        })
        send(user, {
          type: "cardsSent",
          player: scum.username,
          cards: message.cards
        })
      }

      if (user.position === "queen") {
        const viceScum = serverState.users.find(user => user.position === "vice-scum")!
        viceScum.hand.push(...message.cards)
        send(viceScum, {
          type: "cardsReceived",
          player: user.username,
          cards: message.cards
        })
        send(user, {
          type: "cardsSent",
          player: viceScum.username,
          cards: message.cards
        })
      }

      sendGameState(serverState, "gameStateChange")

      if (serverState.waitingOnTrades.length === 0) {
        setTimeout(beginHand, 2000)
      }

      break
    }
  }


  function beginHand() {
    serverState.status = "playing"
    broadcast(serverState, { type: "handBegin" })
  }
}

