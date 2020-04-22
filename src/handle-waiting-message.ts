import { ServerState, broadcast, initGame, sendGameState, userCount } from "./server-state"
import { User, send } from "./user"


export function handleWaitingMessage(user: User, message: ClientToServerMessage, serverState: ServerState): void {
	switch (message.type) {
		case "setReadyState": {
			user.ready = message.ready
			broadcast(serverState, {
				type: "readyStateChange",
				readyStates: serverState.users.reduce<{ [username: string]: boolean }>((readyStates, user) => ({
					...readyStates,
					[user.username]: user.ready
				}), {})
			})

			break
		}

		case "requestGameStart": {
			if (userCount(serverState) <= 1) {
				send(user, {
					type: "badRequest",
					error: "Not enough players to start."
				})

				return
			}

			for (const userToCheck of serverState.users) {
				if (!userToCheck.ready) {
					send(user, {
						type: "badRequest",
						error: `${userToCheck.username} isn't ready.`
					})

					return
				}
			}

			serverState.status = "playing"
			initGame(serverState)
			sendGameState(serverState, "gameStart")

			break
		}
	}
}
