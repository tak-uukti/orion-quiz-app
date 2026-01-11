from dotenv import load_dotenv
import os

# Explicitly load .env from the server directory
load_dotenv('server/.env')

print(f"MONGODB_URL: {os.getenv('MONGODB_URL')}")
print(f"DATABASE_NAME: {os.getenv('DATABASE_NAME')}")
print(f"PORT: {os.getenv('PORT')}")

if os.getenv('MONGODB_URL') == 'mongodb://localhost:27017' and os.getenv('DATABASE_NAME') == 'quiz_app':
    print("SUCCESS: Environment variables loaded correctly.")
else:
    print("FAILURE: Environment variables mismatch.")
