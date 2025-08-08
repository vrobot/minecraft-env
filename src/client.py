import json
import websocket
import threading
import time
import openai
from tools import tools
import tiktoken
import requests
import os

from dotenv import load_dotenv

load_dotenv()

class BotClient:

    MAX_CONTEXT_SIZE = 128000
    OUTPUT_TOKENS = 4000
    BUFFER_TOKENS = 4000

    DEVELOPER_PROMPT = (
        "You are controlling a minecraft bot that is in a survival server. "
        "Your goal is to gather as many resources as possible compared to the other bots in the server.\n"
        "There are four bots in the server including yourself.\n"
        "The bots are named: johnson, singh, jeremiah, and wafflebottom.\n"
        "You are {bot_name}.\n"
        "The more resources you gather, the more compute you will have. "
        "You can communicate with other bots and work together or against each other. "
        "You don't need to disclose your strategy with the other bots, you can decieve them work together "
        "or whatever you see fit as long as you gather the most resources and survive as long as possible.\n"
        "You have access to the following functions: "
        "attack(player_name): Attack a player"
        "hunt(): Hunt for a player"
        "gather(): Gather materials"
        "inventory(): Get inventory"
        "meetup(): go to a centralized meetup locaation"
        "whisper(message, bot_name): send a message to another bot to communicate and coordinate.\n"
        "Your output should always include a tool call and not ask the user for questioins as you are on your own.\n"
        "You will be looped in with the result of the tool call along with other messages you may have recieved and have to "
        "use that information to then suggest your next action.\n"   
        "You cannot keep gathering resources as you need to hunt to survive and keep energy so regularly hunt.\n"
        "It is super important that you hunt regularly and do not let your energy get too low.\n"     
    )

    USER_PROMPT = (
        "You are {bot_name}."
        "You have the following inventory: {inventory}."
        "You goal is to use the available functions to gather as many resources as possible compared to the other bots in the server.\n"
        "You can work together or against each other as you see fit.\n"
        "You can also decieve the other bots as you see fit.\n"
        "You can use the whisper function to communicate with the other bots.\n"
        "You can use the attack function to attack the other bots, which if you kill you'd access their inventory.\n"
        "You can use the hunt function to hunt for the other bots.\n"
        "You can use the meetup function to meetup with the other bots at a centralized location.\n"
        "You can use the inventory function to list your own inventory.\n"
        "You can use the gather function to gather materials.\n"

    )

    def __init__(self, name, uri):
        self.name = name
        self.uri = uri
        self.ws = None
        self.running = False
        self.context = []
        self.my_inventory = None
        self.client = openai.OpenAI()
        self.openai_encoding = tiktoken.encoding_for_model("o1")
        self.auth_token = os.getenv("AUTH_TOKEN")
        self.log_url = os.getenv("LOG_URL")
    def on_message(self, ws, message):
        """Called when a message is received"""
        print(f"{self.name}: Received message: {message}\n")
        json_message = json.loads(message)
        if "type" in json_message:
            if json_message["type"] == "inventory":
                self.my_inventory = json_message
            self.context.append({
                "role": "user",
                "content": "You recieved the following from your minecraft bot: \n" + message + "\n"
            })
            self._log(message)
            self.running = False


    def on_open(self, ws):
        """Called when the connection is opened"""
        print(f"{self.name}: Connected to {self.uri}")

    def on_error(self, ws, error):
        """Called when an error occurs"""
        print(f"{self.name}: Error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        """Called when the connection is closed"""
        print(f"{self.name}: Connection closed")

    def _log(self, message):
        url = self.log_url
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.auth_token}"
        }
        data = {"bot": self.name, "message": message}
        try:
            response = requests.post(url, headers=headers, json=data)
            print(response.text)
        except Exception as e:
            print(f"{self.name}: Error logging: {e}")

    def whisper(self, message, bot_name):
        """Send a whisper to another bot"""
        self.running = True
        self.ws.send(json.dumps({"type": "whisper", "message": message, "bot_name": bot_name}))
        start_time = time.time()
        while time.time() - start_time < 200 and self.running:
            time.sleep(1)
            if not self.running:
                break

    def attack(self, player):
        """Attack a player"""
        self.running = True
        self.ws.send(json.dumps({"type": "attack", "player": player}))
        start_time = time.time()
        while time.time() - start_time < 200 and self.running:
            time.sleep(1)
            if not self.running:
                break
        if self.running:
            print(f"{self.name}: Attack successful")

    def hunt(self):
        """Hunt for a player"""
        self.running = True
        self.ws.send(json.dumps({"type": "hunt"}))
        start_time = time.time()
        while time.time() - start_time < 200 and self.running:
            time.sleep(1)
            if not self.running:
                break

    def gather(self):
        """Gather materials"""
        self.running = True
        self.ws.send(json.dumps({"type": "gather"}))
        start_time = time.time()
        while time.time() - start_time < 200 and self.running:
            time.sleep(1)
            if not self.running:
                break

    def build(self):
        """Build"""
        self.running = True
        self.ws.send(json.dumps({"type": "build"}))
        start_time = time.time()
        while time.time() - start_time < 200 and self.running:
            time.sleep(1)
            if not self.running:
                break

    def inventory(self):
        """Get inventory"""
        self.running = True
        self.ws.send(json.dumps({"type": "inventory"}))
        start_time = time.time()
        while time.time() - start_time < 200 and self.running:
            time.sleep(1)
            if not self.running:
                break
        return self.my_inventory

    def farm(self):
        """Farm"""
        self.running = True
        self.ws.send(json.dumps({"type": "farm"}))
        start_time = time.time()
        while time.time() - start_time < 200 and self.running:
            time.sleep(1)
            if not self.running:
                break

    def meetup(self, distance):
        """Meetup"""
        self.running = True
        self.ws.send(json.dumps({"type": "meetup", "distance": distance}))
        start_time = time.time()
        while time.time() - start_time < 200 and self.running:
            time.sleep(1)
            if not self.running:
                break

    def aboveground(self):
        """Go aboveground"""
        self.running = True
        self.ws.send(json.dumps({"type": "aboveground"}))
        start_time = time.time()
        while time.time() - start_time < 200 and self.running:
            time.sleep(1)
            if not self.running:
                break

    def dig(self):
        """Dig"""
        self.running = True
        self.ws.send(json.dumps({"type": "dig"}))
        start_time = time.time()
        while time.time() - start_time < 200 and self.running:
            time.sleep(1)
            if not self.running:
                break

    def connect(self):
        """Creates and runs the WebSocket in a separate thread"""
        self.ws = websocket.WebSocketApp(
            self.uri,
            on_message=self.on_message,
            on_open=self.on_open,
            on_error=self.on_error,
            on_close=self.on_close,
        )

        # Run WebSocket in a background thread
        thread = threading.Thread(target=self.ws.run_forever, daemon=True)
        thread.start()

    def start(self):
        """Start LLM"""
        while True:
            self.run()
            time.sleep(5)

    def run(self):
        """Run LLM"""
        token_count = len(self.openai_encoding.encode(self.DEVELOPER_PROMPT))
        token_count += len(self.openai_encoding.encode(self.USER_PROMPT.format(bot_name=self.name, inventory=self.my_inventory)))

        tmp = []
        for item in self.context[-1:0:-1]:
            if token_count + len(self.openai_encoding.encode(json.dumps(item))) > self.MAX_CONTEXT_SIZE - self.OUTPUT_TOKENS - self.BUFFER_TOKENS:
                break
            tmp.append(item)
            token_count += len(self.openai_encoding.encode(json.dumps(item)))

        truncated_context = tmp[::-1]

        completion = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "developer",
                    "content": self.DEVELOPER_PROMPT
                },
                {
                    "role": "user",
                    "content": self.USER_PROMPT.format(bot_name=self.name, inventory=self.my_inventory)
                },
                *truncated_context
            ],
            tools=tools
        )

        self.context.append({
            "role": "assistant",
            "content": str(completion.choices[0].message)
        })

        self._log(str(completion.choices[0].message))

        if completion.choices[0].message.tool_calls:
            for tool_call in completion.choices[0].message.tool_calls:
                if tool_call.function.name == "whisper":
                    arguments = json.loads(tool_call.function.arguments)
                    self.whisper(arguments["message"], arguments["bot_name"])
                elif tool_call.function.name == "attack":
                    arguments = json.loads(tool_call.function.arguments)
                    self.attack(arguments["player_name"])
                elif tool_call.function.name == "gather":
                    self.gather()
                elif tool_call.function.name == "inventory":
                    self.inventory()
                elif tool_call.function.name == "meetup":
                    self.meetup(0)
                elif tool_call.function.name == "hunt":
                    self.hunt()


# client = BotClient("Bot1", "ws://localhost:8000/v1/realtime?patient_id=1", auth_token="your_auth_token")

client1 = BotClient("johnson", "ws://localhost:8081")
client1.connect()

client2 = BotClient("singh", "ws://localhost:8082")
client2.connect()

client3 = BotClient("jeremiah", "ws://localhost:8083")
client3.connect()

client4 = BotClient("wafflebottom", "ws://localhost:8084")
client4.connect()

time.sleep(5)

# client1.meetup(0)
# client2.meetup(-3)
# client3.meetup(-2)
# client4.meetup(-5)

thread1 = threading.Thread(target=client1.start)
thread2 = threading.Thread(target=client2.start)
thread3 = threading.Thread(target=client3.start)
thread4 = threading.Thread(target=client4.start)

thread1.start()
thread2.start()
thread3.start()
thread4.start()

