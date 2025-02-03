# app.py
from flask import Flask

app = Flask(__name__)

# routes.py
from app import app

def my_route():
    return "Hello, World!"

app.add_url_rule('/', view_func=my_route)
