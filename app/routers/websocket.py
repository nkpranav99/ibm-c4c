from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from typing import Dict, List
from app.database import get_db
from app.models.auction import Auction, Bid
from app.models.user import User
from app.utils.auth import get_current_user
from jose import JWTError, jwt
from app.config import settings
from datetime import datetime
import json


router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}  # auction_id -> list of WebSockets
    
    async def connect(self, websocket: WebSocket, auction_id: int):
        await websocket.accept()
        if auction_id not in self.active_connections:
            self.active_connections[auction_id] = []
        self.active_connections[auction_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, auction_id: int):
        if auction_id in self.active_connections:
            self.active_connections[auction_id].remove(websocket)
    
    async def broadcast(self, auction_id: int, message: dict):
        if auction_id in self.active_connections:
            for connection in self.active_connections[auction_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass  # Connection may have been closed


manager = ConnectionManager()


def get_user_from_token(token: str, db: Session) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
    
    user = db.query(User).filter(User.email == email).first()
    return user


@router.websocket("/ws/auction/{auction_id}")
async def websocket_endpoint(websocket: WebSocket, auction_id: int):
    await manager.connect(websocket, auction_id)
    
    try:
        # Send initial auction state
        db = next(get_db())
        auction = db.query(Auction).filter(Auction.id == auction_id).first()
        
        if auction:
            await websocket.send_json({
                "type": "auction_state",
                "current_highest_bid": auction.current_highest_bid,
                "end_time": auction.end_time.isoformat() if auction.end_time else None,
                "is_active": auction.is_active
            })
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "new_bid":
                # Broadcast the new bid to all connected clients
                await manager.broadcast(auction_id, {
                    "type": "new_bid",
                    "amount": message.get("amount"),
                    "timestamp": datetime.utcnow().isoformat()
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, auction_id)

