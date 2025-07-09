from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        # A dictionary to hold active connections for each division
        # e.g., {"AMO": [websocket1, websocket2], "Treasury": [websocket3]}
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, division_name: str):
        await websocket.accept()
        if division_name not in self.active_connections:
            self.active_connections[division_name] = []
        self.active_connections[division_name].append(websocket)
        print(f"INFO:     New connection for division '{division_name}'. Total: {len(self.active_connections[division_name])}")

    def disconnect(self, websocket: WebSocket, division_name: str):
        if division_name in self.active_connections:
            self.active_connections[division_name].remove(websocket)
            if not self.active_connections[division_name]:
                del self.active_connections[division_name]
            print(f"INFO:     Connection closed for division '{division_name}'.")

    async def broadcast_to_division(self, message: str, division_name: str):
        if division_name in self.active_connections:
            print(f"INFO:     Broadcasting to {len(self.active_connections[division_name])} clients in division '{division_name}'")
            for connection in self.active_connections[division_name]:
                await connection.send_text(message)

# Create a single, global instance of the manager
manager = ConnectionManager()
