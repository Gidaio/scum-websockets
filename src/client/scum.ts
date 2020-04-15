interface AppState {
	page: "login" | "game"
	socket?: WebSocket
	username?: string
	loginState?: {
		loginError: string
	}
}


// All the elements we need.

const loginSection = document.getElementById("login") as HTMLDivElement
const loginUsernameInput = document.getElementById("login-username") as HTMLInputElement
const loginSubmitButton = document.getElementById("login-submit") as HTMLButtonElement
const loginErrorParagraph = document.getElementById("login-error") as HTMLParagraphElement

const gameSection = document.getElementById("game") as HTMLDivElement


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
		}
	}

	render()


	function handleLoginMessage(message: ServerToClientMessage): void {
		switch (message.type) {
			case "loginAccepted": {
				appState.username = message.username
				appState.page = "game"

				break
			}
		}
	}
}


function render() {
	console.info("Rendering...")

	loginSection.hidden = true
	gameSection.hidden = true

	switch (appState.page) {
		case "login": {
			loginSection.hidden = false
			if (appState.loginState) {
				loginErrorParagraph.innerHTML = appState.loginState.loginError
			}

			break
		}

		case "game": {
			gameSection.hidden = false
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
