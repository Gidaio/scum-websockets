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
	gameState?: GameState & {
		roundEnd: boolean
		trading: boolean
		message?: string
	}
	tradingState?: {
		player: string
		cardsSent?: string[]
		cardsReceived?: string[]
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
const gameSendButton = document.getElementById("game-send") as HTMLButtonElement
const gameMessageDiv = document.getElementById("game-message") as HTMLDivElement


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

	if (appState.gameState.trading) {
		console.warn("You can't play cards while you're trading!")
		return
	}

	if (appState.username !== appState.gameState.currentPlayer) {
		console.warn("It's not your turn!")
		return
	}

	const selectedCards: string[] = []
	for (const element of Array.from(gameHandDiv.children)) {
		if (element.tagName !== "SPAN") {
			continue
		}

		if ((element as HTMLSpanElement).classList.contains("selected")) {
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

	if (appState.gameState.trading) {
		console.warn("You can't pass when you're trading!")
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

gameSendButton.addEventListener("click", () => {
	if (appState.page !== "game") {
		console.warn("Wrong page to send cards!")
		return
	}

	if (!appState.gameState) {
		console.error("No game state somehow...")
		return
	}

	if (!appState.gameState.trading) {
		console.warn("Can't send cards when you're not trading!")
		return
	}

	const self = getSelf()!

	if (self.position !== "king" && self.position !== "queen") {
		console.warn("You're not in a position to send cards!")
		return
	}

	const selectedCards: string[] = []
	for (const element of Array.from(gameHandDiv.children)) {
		if (element.tagName !== "SPAN") {
			continue
		}

		if ((element as HTMLSpanElement).classList.contains("selected")) {
			selectedCards.push(element.id)
		}
	}

	if (self.position === "king") {
		if (selectedCards.length !== 2) {
			console.warn("As king, you must select exactly 2 cards.")
			return
		} else {
			send({
				type: "sendCards",
				cards: selectedCards
			})
		}
	} else if (self.position === "queen") {
		if (selectedCards.length !== 1) {
			console.warn("As queen, you must select exactly 2 cards.")
			return
		} else {
			send({
				type: "sendCards",
				cards: selectedCards
			})
		}
	}
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
					roundEnd: false,
					trading: false
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
					roundEnd: false,
					trading: appState.gameState!.trading
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
					roundEnd: true,
					trading: false
				}

				break
			}

			case "handEnd": {
				appState.gameState!.trading = true
				appState.gameState!.message = "The hand is over!"
				break
			}

			case "handBegin": {
				appState.gameState!.trading = false
				appState.gameState!.message = undefined
				break
			}

			case "cardsSent": {
				appState.tradingState = {
					player: message.player,
					cardsSent: message.cards
				}

				break
			}

			case "cardsReceived": {
				appState.tradingState = {
					player: message.player,
					cardsReceived: message.cards
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
				const { gameState } = appState
				gamePlayersDiv.innerHTML = gameState.players.map(player => {
					let out = player.username

					if (player.position !== "neutral") {
						switch (player.position) {
							case "king": {
								out += " &#x1F451;"
								break
							}

							case "queen": {
								out += " &#x1F984;"
								break
							}

							case "vice-scum": {
								out += " &#x1F612;"
								break
							}

							case "scum": {
								out += " &#x1F4A9;"
								break
							}
						}
					}

					if (player.passed) {
						out = `<s>${out}</s>`
					}

					if (player.username === gameState.currentPlayer) {
						out = `<strong>${out}</strong>`
					}

					return `<p${player.finished ? " style=\"color: grey;\"": ""}>${out}</p>`
				}).join("")

				gameBoardDiv.innerHTML = ""
				if (gameState.board.length && !gameState.trading) {
					const pElement = document.createElement("p")
					const message = document.createElement("p")
					message.innerHTML = `${gameState.roundEnd ? "Taken" : "Played"} by ${gameState.lastPlayer}`
					pElement.append(...renderCards(gameState.board, false))
					gameBoardDiv.append(pElement, message)
				}

				gameHandDiv.innerHTML = ""
				gameHandDiv.append(...renderCards(gameState.hand, true))

				if (gameState.trading) {
					gamePlayCardsButton.hidden = true
					gamePassButton.hidden = true
					if (getSelf()?.position === "king" || getSelf()?.position === "queen") {
						gameSendButton.hidden = false
					}
				} else {
					gamePlayCardsButton.hidden = false
					gamePassButton.hidden = false
					gameSendButton.hidden = true
				}

				gameMessageDiv.innerHTML = ""
				if (appState.tradingState) {
					if (appState.tradingState.cardsSent) {
						const pElement = document.createElement("p")
						pElement.append("Sent ", ...renderCards(appState.tradingState.cardsSent, false), ` to ${appState.tradingState.player}.`)
						gameMessageDiv.appendChild(pElement)
					}

					if (appState.tradingState.cardsReceived) {
						const pElement = document.createElement("p")
						pElement.append("Received ", ...renderCards(appState.tradingState.cardsReceived, false), ` from ${appState.tradingState.player}`)
						gameMessageDiv.appendChild(pElement)
					}
				}
				if (gameState.message) {
					gameMessageDiv.innerHTML += `<p>${gameState.message}</p>`
				}
			}

			break
		}

		default: {
			console.error("Something has gone very wrong.")
		}
	}
}


function renderCards(rawCards: string[], interactable: boolean): HTMLSpanElement[] {
	const cards = rawCards.sort().map(rawCard => {
		let color = ""
		let rank = Number(rawCard.slice(0, 2)) % 13
		if (rank >= 11) {
			rank++
		}
		const suit = rawCard[2]
		if (suit === "D" || suit === "H") {
			color = "red"
		} else {
			color = "black"
		}

		let unicode = 0x1F0A1 + rank
		switch (suit) {
			case "H": {
				unicode += 0x10
				break
			}

			case "D": {
				unicode += 0x20
				break
			}

			case "C": {
				unicode += 0x30
				break
			}
		}

		return {
			color,
			unicode: `&#x${unicode.toString(16)};`,
			card: rawCard
		}
	})

	const cardElements = cards.map(card => {
		const element = document.createElement("span")
		element.id = card.card
		element.classList.add("card", card.color)
		element.innerHTML = card.unicode

		return element
	})

	if (interactable) {
		cardElements.forEach(card => {
			card.addEventListener("click", toggleCardSelected)
		})
	}

	return cardElements
}


function toggleCardSelected(event: MouseEvent) {
	(event.target as HTMLElement).classList.toggle("selected")
}


function getSelf(): Player | null {
	if (appState.gameState) {
		return appState.gameState.players.find(player => player.username === appState.username)!
	}

	return null
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
