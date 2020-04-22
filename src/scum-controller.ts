import { handleLoginMessage } from "./handle-login-message"
import { handlePlayingMessage } from "./handle-playing-message"
import { handleTradingMessage } from "./handle-trading-message"
import { handleWaitingMessage } from "./handle-waiting-message"
import { ServerState } from "./server-state"
import { User } from "./user"

import WebSocket from "ws"


const serverState: ServerState = {
	users: [],
	status: "waiting",
	playerOrder: [],
	currentPlayerIndex: 0,
	waitingOnTrades: [],
	finishedPlayers: [],
	lastPlayer: "",
	board: []
}


export function scumController(wsServer: WebSocket.Server) {
	wsServer.on("connection", socket => {
		let user: User | null = null

		socket.on("message", data => {
			const message: ClientToServerMessage = JSON.parse(data.toString())

			if (!user) {
				user = handleLoginMessage(socket, message, serverState)
				return
			} else {
				switch (serverState.status) {
					case "waiting": {
						handleWaitingMessage(user, message, serverState)
						break
					}

					case "playing": {
						handlePlayingMessage(user, message, serverState)
						break
					}

					case "trading": {
						handleTradingMessage(user, message, serverState)
						break
					}
				}
			}
		})
	})
}
