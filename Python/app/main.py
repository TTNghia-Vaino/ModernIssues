from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import uuid4

from app.decision import decide_chat
from app.retriever import retrieve_products
from chat import chat_with_gemini

# ============================
# FastAPI App
# ============================

app = FastAPI()

origins = [
    "http://siudev.icu",
    "https://siudev.icu",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================
# Session histories
# ============================

session_histories = {}


# ============================
# Request Model
# ============================

class Message(BaseModel):
    text: str
    session_id: str | None = None


# ============================
# Chat API
# ============================

@app.post("/chat")
def chat_api(msg: Message):
    # Create session_id if not exist
    session_id = msg.session_id or str(uuid4())

    # Initialize history for new session
    if session_id not in session_histories:
        session_histories[session_id] = []

    conversation_history = session_histories[session_id]

    # Decide intent / action
    decision = decide_chat(msg.text, conversation_history)

    # If RAG mode => retrieve products
    if decision["action"] == "rag":
        top_products = retrieve_products(msg.text)
        retrieved_text = "\n".join([f"- {p[0]} giá {p[2]}, số lượng tồn kho {p[3]}, số tháng bảo hành {p[4]} " for p in top_products])
        prompt = (
            f"User asked: {msg.text}\n"
            f"Here are relevant products:\n{retrieved_text}\n"
            f"If số lượng tồn kho is 0, do not recommend that product.\n"
            f"Answer naturally."
        )
    else:
        prompt = msg.text

    # Gemini answer
    answer = chat_with_gemini(prompt)

    # Save conversation
    conversation_history.append((msg.text, answer))
    session_histories[session_id] = conversation_history

    return {
        "session_id": session_id,
        "answer": answer,
        "conversation_history": conversation_history,
        "decision": decision,
    }
