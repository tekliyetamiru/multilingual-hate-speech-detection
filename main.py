import os
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes
from telegram.error import BadRequest
from telegram.request import HTTPXRequest

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# --- In-Memory Storage ---
deleted_messages = []

class LogMessage(BaseModel):
    user: str
    message: str
    label: str
    confidence: float
    timestamp: str

# --- Toxicity Detection Mock ---
def detect_toxicity(text: str) -> dict:
    """Mock toxicity detection function."""
    text_lower = text.lower()
    
    if "stupid" in text_lower or "idiot" in text_lower:
        return {"label": "INSULT", "confidence": 0.92}
    elif "hate you" in text_lower:
        return {"label": "HATE_SPEECH", "confidence": 0.90}
    elif "kill you" in text_lower:
        return {"label": "THREAT", "confidence": 0.95}
    elif "damn" in text_lower:
        return {"label": "OBSCENE", "confidence": 0.85}
        
    return {"label": "NON_TOXIC", "confidence": 0.0}

# --- Telegram Bot Logic ---
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming text messages in the group."""
    if not update.message or not update.message.text:
        return
        
    text = update.message.text
    user = update.message.from_user
    username = user.username or user.first_name or "Unknown"
    
    try:
        result = detect_toxicity(text)
        
        # Check if toxic and above confidence threshold (> 0.8)
        if result["label"] != "NON_TOXIC" and result["confidence"] > 0.8:
            logger.warning(f"Toxic message detected from {username}: '{text}' -> {result}")
            
            # Record it (In-memory system)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            log_entry = {
                "user": username,
                "message": text,
                "label": result["label"],
                "confidence": result["confidence"],
                "timestamp": timestamp
            }
            deleted_messages.append(log_entry)
            
            # Reply to the message
            reply_text = f"⚠ Toxic content detected: {result['label']}"
            await update.message.reply_text(reply_text)
            
            # Attempt to delete the original message
            try:
                await update.message.delete()
                logger.info("Original message deleted.")
            except BadRequest as e:
                logger.warning(f"Could not delete message (might lack admin rights): {e}")
            except Exception as e:
                logger.error(f"Error deleting message: {e}")
                
    except Exception as e:
        logger.error(f"Error processing message: {e}")

bot_app = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to safely start and stop the bot."""
    global bot_app
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN environment variable not set. Bot will not start.")
        yield
        return

    logger.info("Initializing Telegram bot...")
    
    # Increase timeout for users on slower networks
    t_request = HTTPXRequest(connect_timeout=20.0, read_timeout=20.0)
    
    # Read optional proxy from environment variables
    proxy_url = os.environ.get("TELEGRAM_PROXY")
    
    bot_builder = Application.builder().token(token).request(t_request)
    if proxy_url:
        logger.info(f"Using proxy: {proxy_url}")
        bot_builder = bot_builder.proxy_url(proxy_url)
        
    bot_app = bot_builder.build()
    
    # Listen to all text messages
    bot_app.add_handler(MessageHandler(filters.TEXT, handle_message))
    
    await bot_app.initialize()
    await bot_app.start()
    await bot_app.updater.start_polling()
    logger.info("Telegram bot started in polling mode.")
    
    yield
    
    if bot_app:
        logger.info("Stopping Telegram bot...")
        await bot_app.updater.stop()
        await bot_app.stop()
        await bot_app.shutdown()

app = FastAPI(lifespan=lifespan)

# Allow CORS so our local index.html can fetch data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "FastAPI and Telegram bot are running", "bot_active": bot_app is not None}

@app.get("/messages")
def get_messages():
    """Return list of all deleted messages as JSON"""
    # Return reversed list so newest is at the top
    return deleted_messages[::-1]

@app.post("/log")
def log_message(msg: LogMessage):
    """Fallback endpoint to manually log from an external service, if needed"""
    deleted_messages.append(msg.dict())
    return {"status": "success", "logged": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
