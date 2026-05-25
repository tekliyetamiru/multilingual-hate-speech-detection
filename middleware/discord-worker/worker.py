"""
Discord Worker - Manages multiple Discord bots for multiple users.
Deployed on Render (free tier).
"""
import asyncio
import os
import sys
import logging
import discord
from discord.ext import commands
import httpx
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv


load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get('DATABASE_URL')
API_URL = os.environ.get('API_URL', 'https://tekliye-toxiguard.hf.space')

if not DATABASE_URL:
    logger.error("❌ DATABASE_URL not set!")
    sys.exit(1)

active_bots = {}

def get_db():
    return psycopg2.connect(DATABASE_URL)

def get_active_discord_bots():
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT dc.id, dc.token, dc.username, dc.blocked_words, dc.user_id,
                       ak.key as api_key
                FROM discord_bot_configs dc
                LEFT JOIN api_keys ak ON dc.api_key_id = ak.id
                WHERE dc.status = 'running'
            """)
            return cur.fetchall()
    finally:
        conn.close()

def check_toxicity(text: str, api_key: str, platform: str = 'discord') -> dict | None:
    try:
        r = httpx.post(
            f"{API_URL}/api/detect",
            json={"text": text, "platform": platform},  # ← ADD platform
            headers={"X-API-Key": api_key, "Content-Type": "application/json"},
            timeout=30.0
        )
        if r.status_code == 200:
            return r.json()
        logger.warning(f"API error {r.status_code}")
        return None
    except Exception as e:
        logger.error(f"API error: {e}")
        return None

class ToxiGuardDiscordBot(commands.Bot):
    def __init__(self, bot_config: dict):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.messages = True
        super().__init__(command_prefix='!', intents=intents)
        self.bot_config = bot_config
        self.bot_id = bot_config['id']
        self.blocked = [w.strip().lower() for w in (bot_config.get('blocked_words') or '').split(',') if w.strip()]

    async def on_ready(self):
        logger.info(f"✅ Discord bot @{self.user} ready")

    async def on_message(self, message: discord.Message):
        if message.author == self.user or message.author.bot:
            return
        
        text = message.content.strip()
        if not text:
            return
        
        # Check blocked words
        if self.blocked and any(w in text.lower() for w in self.blocked):
            try:
                await message.delete()
            except:
                pass
            await message.channel.send(f"{message.author.mention} ⚠️ Blocked words detected.", delete_after=10)
            return
        
        # Check toxicity
        result = check_toxicity(text, self.bot_config.get('api_key', ''))
        if result is None:
            return
        
        data = result.get('data', {})
        if data.get('is_toxic'):
            categories = ', '.join(data.get('toxic_categories', []))
            warning = f"⚠️ Toxic message detected - {categories}"
            
            try:
                await message.delete()
            except:
                await message.channel.send(warning, delete_after=10)
                return
            
            try:
                await message.author.send(f"Your message was removed: {warning}")
            except:
                await message.channel.send(f"{message.author.mention} {warning}", delete_after=10)

async def run_bot(bot_config: dict):
    bot_id = bot_config['id']
    token = bot_config['token']
    username = bot_config['username']
    
    logger.info(f"Starting Discord bot: {username} (id={bot_id})")
    
    # Rate limit protection - wait before connecting
    await asyncio.sleep(5)
    
    bot = ToxiGuardDiscordBot(bot_config)
    active_bots[bot_id] = bot
    
    try:
        await bot.start(token)
    except Exception as e:
        logger.error(f"Discord bot {username} error: {e}")
        # Don't retry immediately - sync loop will handle it
    finally:
        if not bot.is_closed():
            await bot.close()
        if bot_id in active_bots:
            del active_bots[bot_id]

async def sync_bots():
    while True:
        try:
            db_bots = get_active_discord_bots()
            db_bot_ids = {b['id'] for b in db_bots}
            active_bot_ids = set(active_bots.keys())
            
            for bot in db_bots:
                if bot['id'] not in active_bot_ids:
                    asyncio.create_task(run_bot(bot))
                    await asyncio.sleep(5)  # 5 second stagger
            
            for bot_id in active_bot_ids - db_bot_ids:
                if bot_id in active_bots:
                    bot = active_bots[bot_id]
                    await bot.close()
                    del active_bots[bot_id]
            
            logger.info(f"Active Discord bots: {len(active_bots)}")
        except Exception as e:
            logger.error(f"Sync error: {e}")
        
        await asyncio.sleep(30)

async def main():
    logger.info("🚀 Discord Multi-Bot Worker starting...")
    await sync_bots()


# Add at the bottom of worker.py, before if __name__ == '__main__':
from aiohttp import web

async def health_check(request):
    return web.Response(text="OK")

async def run_health_server():
    app = web.Application()
    app.router.add_get('/', health_check)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', int(os.environ.get('PORT', 10000)))
    await site.start()

async def main():
    # Start health check server
    asyncio.create_task(run_health_server())
    # Start bot sync
    await sync_bots()
    
if __name__ == '__main__':
    asyncio.run(main())