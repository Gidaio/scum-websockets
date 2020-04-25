function render(appState: AppState): void {
	loginSection.hidden = true
	loginSection.style.display = "none"
	loggedInSection.hidden = true

	switch (appState.state) {
		case "login": {
			loginSection.hidden = false
			loginSection.style.display = "flex"
			loginUsernameInput.value = ""
			loginErrorParagraph.innerText = appState.loginError || ""

			break
		}

		case "loggedIn": {
			loggedInSection.hidden = false
			loggedInUsernameSpan.innerText = appState.username
			break
		}
	}
}
