# Minecraft Env

A Minecraft bot system that uses AI to create autonomous agents capable of gathering resources, interacting with other bots, and surviving in a Minecraft world.

## Features

- **AI-Powered Bots**: Uses OpenAI's API to create intelligent Minecraft bots
- **Multi-Bot System**: Supports multiple bots interacting in the same server
- **Resource Gathering**: Bots can hunt, gather materials, and manage inventory
- **Combat System**: Includes bot-to-bot combat with weapon management
- **Navigation**: Advanced pathfinding and obstacle clearing capabilities
- **Communication**: Inter-bot communication through whisper system
- **WebSocket Integration**: Real-time communication between bots and server

## Technical Stack

- **Backend**: Node.js (bot logic) and Python (AI client)
- **Libraries**:
  - Mineflayer: Minecraft bot creation and control
  - WebSocket: Real-time communication
  - OpenAI API: Bot intelligence and decision making
  - Pathfinder: Navigation and movement

## Setup

1. Install dependencies:
   ```bash
   # For Node.js components
   npm install

   # For Python components
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   - Create a `.env` file with your OpenAI API key and authentication token
   - Configure Minecraft server settings in `src/bot.js`

3. Start the system:
   ```bash
   # Start the Minecraft server first
   # Then run the bot server
   node src/server.js

   # Run the AI clients
   python src/client.py
   ```

## Bot Capabilities

- **Resource Gathering**
  - Hunt animals for food
  - Gather building materials
  - Manage inventory

- **Navigation**
  - Pathfinding with obstacle avoidance
  - Underground navigation
  - Surface navigation

- **Combat**
  - Weapon selection and management
  - Bot-to-bot combat
  - Health monitoring

- **Communication**
  - Inter-bot messaging
  - Status reporting
  - Coordination between bots

## Architecture

- `src/bot.js`: Core bot implementation with Mineflayer
- `src/client.py`: AI client using OpenAI API
- `src/server.js`: WebSocket server for bot communication
- `src/tools.py`: Utility functions and tools
