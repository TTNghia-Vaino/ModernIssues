from google import genai
import os

client_embed = genai.Client(api_key=os.getenv("GENAI_API_EMBED"))
client_decision = genai.Client(api_key=os.getenv("GENAI_API_DECISION"))
client_chat = genai.Client(api_key=os.getenv("GENAI_API_CHAT"))