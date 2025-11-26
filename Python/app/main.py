from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import uuid4
import psycopg2
from fastapi import FastAPI, HTTPException

from google import genai
from google.genai import types
import os

from app.decision import decide_chat
from app.retriever import retrieve_products
from app.chat import chat_with_gemini
from app.api_key import client_embed

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

conn = psycopg2.connect(
    host="localhost",
    dbname="mi-project",
    user="postgres",
    password="123321Es",
    port=5432
)
cursor = conn.cursor()

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


class UpdateEmbeddingRequest(BaseModel):
    product_id: int


@app.post("/update-vector-by-product-id")
def update_vector(req: UpdateEmbeddingRequest):
    product_id = req.product_id

    # 1. Lấy description
    cursor.execute("SELECT description FROM products WHERE product_id = %s", (product_id,))
    row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Product not found")

    description = row[0]

    if not description:
        raise HTTPException(status_code=400, detail="Description is empty, cannot generate embedding")

    # 2. Gọi API embedding
    result = client_embed.models.embed_content(
        model="gemini-embedding-001",
        contents=[description],
        config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
    )

    embedding_vector = result.embeddings[0].values

    # 3. Update DB
    cursor.execute(
        "UPDATE products SET embedding = %s WHERE product_id = %s",
        (embedding_vector, product_id)
    )
    conn.commit()

    return {
        "status": "success",
        "product_id": product_id,
        "embedding_length": len(embedding_vector),
    }