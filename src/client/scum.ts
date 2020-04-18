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
		players: { username: string, passed: boolean }[]
		currentPlayer: string
		lastPlayer: string
		board: string[]
		hand: string[]
		roundEnd: boolean
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
const gamePlayCardsButton = document.getElementById("game-play-cards") as HTMLButtonElement
const gamePassButton = document.getElementById("game-pass") as HTMLButtonElement


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

gamePlayCardsButton.addEventListener("click", () => {
	if (appState.page !== "game") {
		console.warn("Incorrect page to play cards!")
		return
	}

	if (!appState.gameState) {
		console.error("No game state somehow!")
		return
	}

	if (appState.username !== appState.gameState.currentPlayer) {
		console.warn("It's not your turn!")
		return
	}

	const selectedCards: string[] = []
	for (const element of Array.from(gameHandDiv.children)) {
		if (element.tagName !== "INPUT") {
			continue
		}

		if ((element as HTMLInputElement).checked) {
			selectedCards.push(element.id)
		}
	}

	if (appState.gameState.board.length > 0 && appState.gameState.board.length !== selectedCards.length) {
		console.warn("You must play the same number of cards as are in the middle!")
		return
	}

	const cardRank = selectedCards[0].slice(0, 2)
	if (!selectedCards.every(card => card.slice(0, 2) === cardRank)) {
		console.warn("All played cards must be of the same rank.")
		return
	}

	if (appState.gameState.board.length > 0) {
		const boardRank = appState.gameState.board[0].slice(0, 2)
		if (Number(cardRank) <= Number(boardRank)) {
			console.warn("You must exceed the rank of the cards in the middle!")
			return
		}
	}

	send({
		type: "playCards",
		cards: selectedCards
	})
})

gamePassButton.addEventListener("click", () => {
	if (appState.page !== "game") {
		console.warn("Wrong page to pass!")
		return
	}

	if (!appState.gameState) {
		console.error("No game state somehow!")
		return
	}

	if (appState.username !== appState.gameState.currentPlayer) {
		console.warn("It's not your turn!")
		return
	}

	if (appState.gameState.board.length === 0) {
		console.warn("You can't pass when you're leading. You're welcome.")
		return
	}

	send({ type: "pass" })
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

			case "game": {
				handleGameMessage(message)
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
					currentPlayer: message.currentPlayer,
					lastPlayer: message.lastPlayer,
					board: message.board,
					hand: message.hand,
					roundEnd: false
				}

				break
			}
		}
	}

	function handleGameMessage(message: ServerToClientMessage): void {
		switch (message.type) {
			case "gameStateChange": {
				appState.gameState = {
					players: message.players,
					currentPlayer: message.currentPlayer,
					lastPlayer: message.lastPlayer,
					board: message.board,
					hand: message.hand,
					roundEnd: false
				}

				break
			}

			case "roundEnd": {
				appState.gameState = {
					players: message.players,
					currentPlayer: message.currentPlayer,
					lastPlayer: message.lastPlayer,
					board: message.board,
					hand: message.hand,
					roundEnd: true
				}
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
				const { gameState } = appState
				gamePlayersDiv.innerHTML = gameState.players.map(player => {
					let out = player.username

					if (player.passed) {
						out = `<s>${out}</s>`
					}

					if (player.username === gameState.currentPlayer) {
						out = `<strong>${out}</strong>`
					}

					return `<p>${out}</p>`
				}).join("")

				gameBoardDiv.innerHTML = ""
				if (gameState.board.length) {
					gameBoardDiv.innerHTML =
						`<p>${gameState.board.sort().join(" ")}</p>` +
						`<p>${gameState.roundEnd ? "Taken" : "Played"} by ${gameState.lastPlayer}</p>`
				}

				gameHandDiv.innerHTML = appState.gameState.hand.sort().map(card =>
					`<input id="${card}" type="checkbox"><label for="${card}">${card}</label>`
				).join(" ")
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
