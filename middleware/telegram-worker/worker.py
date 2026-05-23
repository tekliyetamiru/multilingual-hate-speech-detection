"""
Telegram Worker - Manages multiple Telegram bots for multiple users.
Deployed on Render.
"""
import asyncio
import os
import sys
import logging
import httpx
import psycopg2
import psycopg2.extras
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get('DATABASE_URL')
API_URL = os.environ.get('API_URL', 'https://tekliye-toxiguard.hf.space')

if not DATABASE_URL:
    logger.error("❌ DATABASE_URL not set!")
    sys.exit(1)

active_bots = {}

def get_db():
    return psycopg2.connect(DATABASE_URL)

def get_active_telegram_bots():
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT bc.id, bc.token, bc.username, bc.blocked_words, bc.user_id, 
                       ak.key as api_key
                FROM bot_configs bc
                JOIN users u ON bc.user_id = u.id
                LEFT JOIN api_keys ak ON bc.api_key_id = ak.id
                WHERE bc.status = 'running' AND u.credits > 0
            """)
            return cur.fetchall()
    finally:
        conn.close()


async def run_bot(bot_config: dict):
    bot_id = bot_config['id']
    token = bot_config['token']
    username = bot_config['username']
    blocked_words = bot_config['blocked_words'] or ''
    api_key = bot_config.get('api_key', '')
    
    logger.info(f"Starting bot: @{username} (id={bot_id})")
    
    application = Application.builder().token(token).build()
    
    # Delete webhook to ensure clean polling
    await application.bot.delete_webhook(drop_pending_updates=True)
    
    # Define handler INSIDE run_bot so it has access to these variables
    async def msg_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not update.message or not update.message.text:
            return
        text = update.message.text
        
        # Check blocked words
        blocked = [w.strip().lower() for w in blocked_words.split(',') if w.strip()]
        if blocked and any(w in text.lower() for w in blocked):
            await update.message.reply_text("⚠️ Your message contains blocked words.")
            return
        
        # Check toxicity
        result = check_toxicity(text, api_key)
        if result is None:
            return
        
        data = result.get('data', {})
        if data.get('is_toxic'):
            categories = ', '.join(data.get('toxic_categories', []))
            score = data.get('toxicity_score', 0)
            warning = f"⚠️ Toxic message detected ({score:.0%}) - {categories}"
            try:
                await update.message.delete()
            except:
                await update.message.reply_text(warning)
                return
            try:
                await update.message.from_user.send_message(warning)
            except:
                mention = f"@{update.message.from_user.username}" if update.message.from_user.username else update.message.from_user.first_name
                await update.message.chat.send_message(f"{mention} {warning}")
    
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, msg_handler))
    
    await application.initialize()
    await application.start()
    await application.updater.start_polling()
    
    active_bots[bot_id] = application
    logger.info(f"✅ Bot @{username} is running")
    
    try:
        while True:
            await asyncio.sleep(60)
    except asyncio.CancelledError:
        pass
    finally:
        await application.stop()
        del active_bots[bot_id]

async def sync_bots():
    while True:
        try:
            db_bots = get_active_telegram_bots()
            db_bot_ids = {b['id'] for b in db_bots}
            active_bot_ids = set(active_bots.keys())
            
            for bot in db_bots:
                if bot['id'] not in active_bot_ids:
                    asyncio.create_task(run_bot(bot))
                    await asyncio.sleep(2)
            
            for bot_id in active_bot_ids - db_bot_ids:
                if bot_id in active_bots:
                    app = active_bots[bot_id]
                    await app.stop()
                    del active_bots[bot_id]
            
            logger.info(f"Active bots: {len(active_bots)}")
        except Exception as e:
            logger.error(f"Sync error: {e}")
        
        await asyncio.sleep(30)

# Simple HTTP server for Render port binding
async def health_server():
    import aiohttp
    from aiohttp import web
    async def handler(request):
        return web.Response(text="OK")
    app = web.Application()
    app.router.add_get('/', handler)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', int(os.environ.get('PORT', 10000)))
    await site.start()

async def main():
    logger.info("🚀 Telegram Multi-Bot Worker starting...")
    asyncio.create_task(health_server())
    await sync_bots()

if __name__ == '__main__':
    asyncio.run(main())