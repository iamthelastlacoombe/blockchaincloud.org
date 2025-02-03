import socket
import threading
import json

class P2PNode:
    def __init__(self, host: str, port: int, blockchain: Blockchain):
        self.host = host
        self.port = port
        self.blockchain = blockchain
        self.peers = set()

    def start_server(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.bind((self.host, self.port))
        server.listen(5)
        print(f"Node started on {self.host}:{self.port}")

        while True:
            client_socket, addr = server.accept()
            print(f"Connection from {addr}")
            threading.Thread(target=self.handle_client, args=(client_socket,)).start()

    def handle_client(self, client_socket: socket.socket):
        request = client_socket.recv(1024).decode('utf-8')
        if request == "get_chain":
            response = json.dumps([block.__dict__ for block in self.blockchain.chain])
            client_socket.send(response.encode('utf-8'))
        client_socket.close()

    def connect_to_peer(self, peer_host: str, peer_port: int):
        if (peer_host, peer_port) not in self.peers:
            try:
                client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                client_socket.connect((peer_host, peer_port))
                self.peers.add((peer_host, peer_port))
                print(f"Connected to peer {peer_host}:{peer_port}")
                client_socket.send("get_chain".encode('utf-8'))
                response = client_socket.recv(1024).decode('utf-8')
                self.update_blockchain(json.loads(response))
                client_socket.close()
            except Exception as e:
                print(f"Failed to connect to peer {peer_host}:{peer_port}: {e}")

    def update_blockchain(self, chain_data: List[Dict]):
        new_chain = [Block(**block) for block in chain_data]
        if len(new_chain) > len(self.blockchain.chain):
            self.blockchain.chain = new_chain
            print("Blockchain updated")

    def broadcast_new_block(self, block: Block):
        for peer in self.peers:
            try:
                client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                client_socket.connect(peer)
                client_socket.send(json.dumps(block.__dict__).encode('utf-8'))
                client_socket.close()
            except Exception as e:
                print(f"Failed to broadcast to {peer}: {e}")