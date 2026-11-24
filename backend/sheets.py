
import os
from pathlib import Path

import gspread
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SERVICE_ACCOUNT_FILE = BASE_DIR / os.getenv(
    "GOOGLE_SERVICE_ACCOUNT_FILE",
    "credentials/service-account.json"
)

SPREADSHEET_ID = os.getenv("GOOGLE_SHEET_ID")
WORKSHEET_NAME = os.getenv("GOOGLE_SHEET_WORKSHEET", "Sheet1")


def get_worksheet():
    if not SERVICE_ACCOUNT_FILE.exists():
        raise FileNotFoundError(
            f"Service account file not found: {SERVICE_ACCOUNT_FILE}"
        )

    if not SPREADSHEET_ID:
        raise ValueError("GOOGLE_SHEET_ID is not configured.")

    client = gspread.service_account(
        filename=str(SERVICE_ACCOUNT_FILE)
    )

    spreadsheet = client.open_by_key(SPREADSHEET_ID)

    return spreadsheet.worksheet(WORKSHEET_NAME)


def get_profiles():
    try:
        worksheet = get_worksheet()
        rows = worksheet.get_all_values()

        if not rows:
            return []

        headers = [
            header.strip().lower()
            for header in rows[0]
        ]

        profiles = []

        for row in rows[1:]:
            data = {}

            for index, header in enumerate(headers):
                if not header:
                    continue

                value = row[index].strip() if index < len(row) else ""
                data[header] = value

            if not data.get("name"):
                continue

            age = data.get("age", "")

            profiles.append({
                "name": data.get("name", ""),
                "photo": data.get("photo", ""),
                "age": int(age) if age.isdigit() else None,
                "country": data.get("country", ""),
                "interest": data.get("interest", ""),
                "netWorth": data.get("net worth", "")
            })

        return profiles

    except Exception as error:
        print(f"Google Sheets error: {error}")
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve profiles from Google Sheets."
        )
