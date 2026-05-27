from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os

app = Flask(
    __name__,
    static_folder="public",
    static_url_path=""
)

CORS(app)

USERS_FILE = "users.json"

if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, "w") as f:
        json.dump([], f)

def load_users():
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

@app.route("/")
def home():
    return send_from_directory("public", "index.html")

@app.route("/signup", methods=["POST"])
def signup():

    data = request.json

    email = data.get("email")
    password = data.get("password")

    users = load_users()

    for user in users:
        if user["email"] == email:
            return jsonify({
                "success": False,
                "message": "User already exists"
            })

    users.append({
        "email": email,
        "password": password
    })

    save_users(users)

    return jsonify({
        "success": True,
        "message": "Signup successful"
    })

@app.route("/login", methods=["POST"])
def login():

    data = request.json

    email = data.get("email")
    password = data.get("password")

    users = load_users()

    for user in users:
        if user["email"] == email and user["password"] == password:
            return jsonify({
                "success": True,
                "message": "Login successful"
            })

    return jsonify({
        "success": False,
        "message": "Invalid credentials"
    })

@app.route("/generate", methods=["POST"])
def generate():

    data = request.json

    product = data.get("product")

    result = f"🔥 Premium {product} with AI generated SEO description, viral marketing strategy and high converting sales copy."

    return jsonify({
        "success": True,
        "result": result
    })

if __name__ == "__main__":
    app.run(debug=True)