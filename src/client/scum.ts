interface AppState {
	page: "login" | "waitingRoom" | "game"
	socket?: WebSocket
	username?: string
	loginState?: {
		loginError: string
	}
	waitingRoomState?: {
		readyStates: {
			[username: string]: boolean
		}
		ready: boolean
	}
	gameState?: {
		players: string[]
		hand: string[]
	}
}


// All the elements we need.

const loginSection = document.getElementById("login") as HTMLDivElement
const loginUsernameInput = document.getElementById("login-username") as HTMLInputElement
const loginSubmitButton = document.getElementById("login-submit") as HTMLButtonElement
const loginErrorParagraph = document.getElementById("login-error") as HTMLParagraphElement

const waitingRoomSection = document.getElementById("waiting-room") as HTMLDivElement
const waitingRoomPlayersDiv = document.getElementById("waiting-room-players") as HTMLDivElement
const waitingRoomReadyToggleButton = document.getElementById("waiting-room-ready-toggle") as HTMLButtonElement
const waitingRoomStartGameButton = document.getElementById("waiting-room-start-game") as HTMLButtonElement

const gameSection = document.getElementById("game") as HTMLDivElement
const gamePlayersDiv = document.getElementById("game-players") as HTMLDivElement
const gameBoardDiv = document.getElementById("game-board") as HTMLDivElement
const gameHandDiv = document.getElementById("game-hand") as HTMLDivElement


const appState: AppState = {
	page: "login"
}


render()


loginSubmitButton.addEventListener("click", () => {
	if (appState.page !== "login") {
		console.warn("Incorrect page to login.")
		return
	}

	loginErrorParagraph.innerHTML = ""

	if (loginUsernameInput.value === "") {
		appState.loginState = {
			loginError: "You must specify a username!"
		}
		render()

		return
	}

	const socket = new WebSocket(`ws://${location.host}`)

	socket.addEventListener("open", () => {
		console.info("Connection established!")
		appState.socket = socket
		socket.addEventListener("message", handleSocketMessage)
		delete appState.loginState
		send({
			type: "loginRequest",
			username: loginUsernameInput.value
		})
	})

	socket.addEventListener("close", () => {
		console.warn("Socket was closed.")
		delete appState.socket
		appState.page = "login"
		appState.loginState = appState.loginState || {
			loginError: "The connection to the server was closed."
		}
	})

	socket.addEventListener("error", () => {
		console.error("Error establishing WebSocket connection.")
	})
})

waitingRoomReadyToggleButton.addEventListener("click", () => {
	if (appState.page !== "waitingRoom") {
		console.warn("Wrong state to toggle ready state!")
		return
	}

	if (!appState.waitingRoomState) {
		console.error("Somehow the state is missing...")
		return
	}

	send({
		type: "setReadyState",
		ready: !appState.waitingRoomState.ready
	})
})

waitingRoomStartGameButton.addEventListener("click", () => {
	if (appState.page !== "waitingRoom") {
		console.warn("Incorrect page to request game start!")
		return
	}

	send({ type: "requestGameStart" })
})


function handleSocketMessage(event: MessageEvent) {
	console.info("Message received!")
	const message: ServerToClientMessage = JSON.parse(event.data)

	if (message.type === "badRequest") {
		console.error(message.error)
	} else {
		switch (appState.page) {
			case "login": {
				handleLoginMessage(message)
				break
			}

			case "waitingRoom": {
				handleWaitingRoomMessage(message)
				break
			}
		}
	}

	render()


	function handleLoginMessage(message: ServerToClientMessage): void {
		switch (message.type) {
			case "loginAccepted": {
				appState.username = message.username
				appState.page = "waitingRoom"
				send({
					type: "setReadyState",
					ready: false
				})

				break
			}
		}
	}

	function handleWaitingRoomMessage(message: ServerToClientMessage): void {
		switch (message.type) {
			case "readyStateChange": {
				appState.waitingRoomState = {
					readyStates: message.readyStates,
					ready: message.readyStates[appState.username!]
				}

				break
			}

			case "gameStart": {
				delete appState.waitingRoomState
				appState.page = "game"
				appState.gameState = {
					players: message.players,
					hand: message.hand
				}

				break
			}
		}
	}
}


function render() {
	console.info("Rendering...")

	loginSection.hidden = true
	waitingRoomSection.hidden = true
	gameSection.hidden = true

	switch (appState.page) {
		case "login": {
			loginSection.hidden = false
			if (appState.loginState) {
				loginErrorParagraph.innerHTML = appState.loginState.loginError
			}

			break
		}

		case "waitingRoom": {
			waitingRoomSection.hidden = false
			if (appState.waitingRoomState) {
				const { ready, readyStates } = appState.waitingRoomState
				let playerReadyStatesHTML = ""
				for (const username in readyStates) {
					playerReadyStatesHTML += `<p>${username}: ${readyStates[username] ? "Ready" : "Not Ready"}</p>`
				}

				waitingRoomPlayersDiv.innerHTML = playerReadyStatesHTML

				waitingRoomReadyToggleButton.innerHTML = ready ? "I'm Not Ready" : "I'm Ready"
			}

			break
		}

		case "game": {
			gameSection.hidden = false
			if (appState.gameState) {
				gamePlayersDiv.innerHTML = appState.gameState.players
					.reduce<string>((html, player) => html + `<p>${player}</p>`, "")

				gameHandDiv.innerHTML = appState.gameState.hand.join(", ")
			}

			break
		}

		default: {
			console.error("Something has gone very wrong.")
		}
	}
}


function send<T extends ClientToServerMessage>(message: T) {
	if (!appState.socket) {
		console.error("No socket!")
		return
	}

	if (appState.socket.readyState !== WebSocket.OPEN) {
		console.error("Socket not open!")
		return
	}

	appState.socket.send(JSON.stringify(message))
}
