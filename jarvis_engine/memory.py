import sqlite3
import json
import threading
from datetime import datetime
from typing import Dict, Any, List

class JarvisMemory:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        # Singleton architecture to prevent Threading File lock crash on multiple Daemon/Websocket instances
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(JarvisMemory, cls).__new__(cls)
        return cls._instance

    def __init__(self, db_path: str = "jarvis_memory.db"):
        if not hasattr(self, 'initialized'):
            self.db_path = db_path
            # Persistent memory pool holding the file stream open securely
            self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._init_db()
            self.initialized = True

    def _init_db(self):
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS agent_states (
                agent_id TEXT PRIMARY KEY,
                state_data TEXT,
                updated_at TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT,
                role TEXT,
                content TEXT,
                timestamp TIMESTAMP
            )
        ''')
        self.conn.commit()

    def save_agent_state(self, agent_id: str, state: Dict[str, Any]):
        with self._lock:
            cursor = self.conn.cursor()
            state_json = json.dumps(state)
            now = datetime.now().isoformat()
            cursor.execute('''
                INSERT INTO agent_states (agent_id, state_data, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(agent_id) DO UPDATE SET
                    state_data=excluded.state_data,
                    updated_at=excluded.updated_at
            ''', (agent_id, state_json, now))
            self.conn.commit()

    def get_agent_state(self, agent_id: str) -> Dict[str, Any]:
        with self._lock:
            cursor = self.conn.cursor()
            cursor.execute('SELECT state_data FROM agent_states WHERE agent_id = ?', (agent_id,))
            row = cursor.fetchone()
            if row:
                return json.loads(row[0])
            return {}

    def log_conversation(self, agent_id: str, role: str, content: str):
        with self._lock:
            cursor = self.conn.cursor()
            now = datetime.now().isoformat()
            cursor.execute('''
                INSERT INTO conversation_logs (agent_id, role, content, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (agent_id, role, content, now))
            self.conn.commit()
            
    def get_recent_logs(self, agent_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            cursor = self.conn.cursor()
            cursor.execute('''
                SELECT role, content, timestamp 
                FROM conversation_logs 
                WHERE agent_id = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            ''', (agent_id, limit))
            rows = cursor.fetchall()
            return [{"role": r[0], "content": r[1], "timestamp": r[2]} for r in reversed(rows)]
