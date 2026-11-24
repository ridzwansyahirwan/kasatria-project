
const API_BASE = "";

// Get Google Client ID from index.html
const GOOGLE_CLIENT_ID = document
    .querySelector('meta[name="google-client-id"]')
    .content;


// =====================================
// INITIALIZE GOOGLE LOGIN
// =====================================

function initializeGoogleLogin() {

    if (!window.google || !window.google.accounts) {
        setTimeout(initializeGoogleLogin, 300);
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleLogin
    });

    google.accounts.id.renderButton(
        document.getElementById("google-button"),
        {
            theme: "outline",
            size: "large",
            shape: "rectangular",
            text: "signin_with"
        }
    );
}


// =====================================
// GOOGLE LOGIN CALLBACK
// =====================================

async function handleGoogleLogin(response) {

    const errorElement = document.getElementById("login-error");

    errorElement.textContent = "";

    try {

        const result = await fetch(`${API_BASE}/auth/google`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "same-origin",

            body: JSON.stringify({
                credential: response.credential
            })
        });

        const data = await result.json();

        if (!result.ok) {
            throw new Error(data.detail || "Login failed.");
        }

        showMainApplication(data);

        await loadProfiles();

    } catch (error) {

        console.error("Google login error:", error);

        errorElement.textContent = error.message;
    }
}


// =====================================
// SHOW MAIN APPLICATION
// =====================================

function showMainApplication(user) {

    const loginPage = document.getElementById("login-page");
    const mainApp = document.getElementById("main-app");

    const userInfo = document.getElementById("user-info");

    const image = document.createElement("img");

    image.src = user.picture || "";
    image.alt = "Profile";

    const name = document.createElement("span");

    name.textContent = user.name || user.email;

    userInfo.replaceChildren(image, name);

    loginPage.style.display = "none";
    mainApp.style.display = "block";
}


// =====================================
// RESTORE LOGIN SESSION
// =====================================

async function restoreSession() {

    try {

        const response = await fetch(`${API_BASE}/auth/me`, {
            credentials: "same-origin"
        });

        if (!response.ok) {
            return;
        }

        const user = await response.json();

        showMainApplication(user);

        await loadProfiles();

    } catch (error) {

        console.error("Session restoration error:", error);
    }
}


// =====================================
// LOGOUT
// =====================================

async function logout() {

    try {

        const response = await fetch(`${API_BASE}/auth/logout`, {
            method: "POST",
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Unable to logout.");
        }

        document.getElementById("main-app").style.display = "none";
        document.getElementById("login-page").style.display = "flex";

        document.getElementById("user-info").replaceChildren();

        document.getElementById("login-error").textContent = "";

        // Clear the previous Google login state
        google.accounts.id.disableAutoSelect();

    } catch (error) {

        console.error("Logout error:", error);
    }
}


// =====================================
// EVENT LISTENERS
// =====================================

document
    .getElementById("logout-button")
    .addEventListener("click", logout);


// =====================================
// INITIALIZE APPLICATION
// =====================================

initializeGoogleLogin();
restoreSession();
