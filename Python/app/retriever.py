import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from google.genai import types
from app.api_key import client_embed
from app.database import names, prices, vectors, stocks, warranties

def retrieve_products(user_input, top_k=5):
    query_embedding = client_embed.models.embed_content(
        model="gemini-embedding-001",
        contents=user_input,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
    ).embeddings[0].values

    sims = cosine_similarity([query_embedding], vectors)[0]
    top_indices = np.argsort(sims)[::-1][:top_k]
    return [(names[i], sims[i], prices[i], stocks[i], warranties[i]) for i in top_indices]