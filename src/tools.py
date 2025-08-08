whisper_tool = {
    "type": "function",
    "function": {
        "name": "whisper",
        "description": "Send a message to another bot.",
        "parameters": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "The message to send to the other bot."
                },
                "bot_name": {
                    "type": "string",
                    "description": "The name of the bot to send the message to."
                }
            },
            "required": [
                "message",
                "bot_name"
            ],
            "additionalProperties": False
        },
        "strict": True
    }
}

attack_tool = {
    "type": "function",
    "function": {
        "name": "attack",
        "description": "Attack a player.",
        "parameters": {
            "type": "object",
            "properties": {
                "player_name": {
                    "type": "string",
                    "description": "The name of the player to attack."
                }
            },
            "required": [
                "player_name"
            ],
            "additionalProperties": False   
        },
        "strict": True
    }
}

gather_tool = {
    "type": "function",
    "function": {
        "name": "gather",
        "description": "Gather materials.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False
        },
        "strict": True
    }
}

meetup_tool = {
    "type": "function",
    "function": {
        "name": "meetup",
        "description": "Meetup with another bot.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False
        },
        "strict": True
    }
}

inventory_tool = {
    "type": "function",
    "function": {
        "name": "inventory",
        "description": "List your own inventory.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False
        },
        "strict": True
    }
}

hunt_tool = {
    "type": "function",
    "function": {
        "name": "hunt",
        "description": "Hunt animals for food.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False
        },
        "strict": True
    }
}

tools = [whisper_tool, attack_tool, gather_tool, meetup_tool, inventory_tool, hunt_tool]










