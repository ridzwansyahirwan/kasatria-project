
import os

from dotenv import load_dotenv
from fastapi import HTTPException, Request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")


def verify_google_token(credential: str):
    """Verify the Google Identity Services credential."""

    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google Client ID is not configured."
        )

    try:
        user = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        if not user.get("email_verified"):
            raise HTTPException(
                status_code=401,
                detail="Google email is not verified."
            )

        return {
            "google_id": user["sub"],
            "name": user.get("name"),
            "email": user.get("email"),
            "picture": user.get("picture")
        }

    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google login credential."
        )


def require_auth(request: Request):
    """Retrieve the authenticated user from the session."""

    user = request.session.get("user")

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Please login first."
        )

    return user
