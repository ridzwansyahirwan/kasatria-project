
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware

from backend.auth import verify_google_token, require_auth
from backend.sheets import get_profiles

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Configuration
SESSION_SECRET = os.getenv("SESSION_SECRET")

if not SESSION_SECRET:
    raise RuntimeError("SESSION_SECRET is not configured.")

FRONTEND_DIR = BASE_DIR / "frontend"

# Initialize FastAPI
app = FastAPI(title="Kasatria Demo API")

# Session configuration
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="kasatria_session",
    max_age=28800,
    same_site="lax",
    https_only=False  # Set True when using HTTPS in production
)

# Serve frontend assets
app.mount(
    "/css",
    StaticFiles(directory=FRONTEND_DIR / "css"),
    name="css"
)

app.mount(
    "/js",
    StaticFiles(directory=FRONTEND_DIR / "js"),
    name="js"
)

# Main webpage
@app.get("/")
def index():
    return FileResponse(FRONTEND_DIR / "index.html")


# Google Login request model
class GoogleLoginRequest(BaseModel):
    credential: str


# Google Login
@app.post("/auth/google")
def google_login(payload: GoogleLoginRequest, request: Request):
    user = verify_google_token(payload.credential)

    request.session["user"] = user

    return {
        "message": "Login successful",
        **user
    }


# Restore login session
@app.get("/auth/me")
def get_current_user(request: Request):
    return require_auth(request)


# Logout
@app.post("/auth/logout")
def logout(request: Request):
    request.session.clear()

    return {
        "message": "Logged out successfully"
    }


# Protected Google Sheets API
@app.get("/api/profiles")
def fetch_profiles(request: Request):
    require_auth(request)

    profiles = get_profiles()

    return {
        "total": len(profiles),
        "profiles": profiles
    }


# Health check
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "application": "Kasatria Demo"
    }
