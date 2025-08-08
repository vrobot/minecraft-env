const mineflayer = require('mineflayer');
const WebSocket = require('ws');
const { pathfinder, Movements, goals: { GoalNear, GoalBlock } } = require('mineflayer-pathfinder');
const { goals } = require('mineflayer-pathfinder');
const { getBotByName } = require('./bots');

const mcData = require('minecraft-data');
const { Vec3 } = require('vec3');

class Bot {
    constructor(name, wsPort) {
        this.name = name;
        this.wsPort = wsPort;
        this.bot = mineflayer.createBot({
            host: 'localhost', // change if necessary
            port: 25565,       // default Minecraft server port
            username: name
        });

        this.bot.loadPlugin(pathfinder);
        this.bot.once('spawn', () => {
            console.log(`${this.name} has spawned in the Minecraft world!`);
            this.bot.chat('/tp @s -161 -42 -3');

            const data = mcData(this.bot.version);
            this.movements = new Movements(this.bot, data);
            this.movements.canDig = false;
            this.bot.pathfinder.setMovements(this.movements);
        });

        // **Detect Health Loss & Identify Cause**
        this.bot.on('health', () => {
            if (this.bot.health >= this.lastHealth) return; // Only trigger if health is reduced
        
            this.wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'i was attacked', current_health: this.bot.health }));
                }
            });
        
            this.lastHealth = this.bot.health;
        });

        this.bot.on('whisper', (username, message) => {
            if (username === this.bot.username) return; // Ignore self-whispers if applicable
            this.wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'message', message: message, sender: username }));
                }
            });
        });

        this.setupWebSocket();
    }

    setupWebSocket() {
        this.wss = new WebSocket.Server({ port: this.wsPort });
        console.log(`${this.name} WebSocket server started on port ${this.wsPort}`);

        this.wss.on('connection', ws => {
            console.log(`Client connected to ${this.name}'s WebSocket server`);
            ws.on('message', message => {
                try {
                    const parsed = JSON.parse(message);
                    if (parsed.type === 'hunt') {
                        this.hunt().then(() => {
                            ws.send(JSON.stringify({ type: 'hunting', status: 'done' }));
                        }).catch(err => {
                            ws.send(JSON.stringify({ type: 'hunting', status: 'error', error: err.message }));
                        });
                    } else if (parsed.type === 'aboveground') {
                        this.ensureAboveGround();
                    } else if (parsed.type === 'dig') {
                        this.goUnderground();
                    } else if (parsed.type === 'meetup') {
                        this.meetUp(parsed.distance).then(() => {
                            ws.send(JSON.stringify({ type: 'meetup', status: 'done' }));
                        }).catch(err => {
                            ws.send(JSON.stringify({ type: 'meetup', status: 'error', error: err.message }));
                        });
                    } else if (parsed.type === 'gather') {
                        this.gatherMaterials().then(result => {
                            ws.send(JSON.stringify({ type: 'gather', status: 'done', result }));
                        }).catch(err => {
                            ws.send(JSON.stringify({ type: 'gather', status: 'error', error: err.message }));
                        });
                    } else if (parsed.type === 'inventory') {
                        this.getInventory().then(inventory => {
                            ws.send(JSON.stringify({ type: 'inventory', inventory }));
                        });
                    } else if (parsed.type === 'build') {
                        this.buildStructure().then(structure => {
                            ws.send(JSON.stringify({ type: 'build', structure }));
                        });
                    } else if (parsed.type === 'attack') {
                        // For attack, expect a 'player' property in the JSON
                        if (parsed.player) {
                            this.attackBot(parsed.player).then(() => {
                                ws.send(JSON.stringify({ type: 'attack', status: 'done' }));
                            }).catch(err => {
                                ws.send(JSON.stringify({ type: 'attack', status: 'error', error: err.message }));
                            });
                        } else {
                            console.error(`${this.name}: No player specified for attack command`);
                            ws.send(JSON.stringify({ type: 'attack', status: 'error', error: 'No player specified' }));
                        }
                    } else if (parsed.type === 'whisper') {
                        this.sendMessage(parsed.bot_name, parsed.message).then(() => {
                            ws.send(JSON.stringify({ type: 'whisper', status: 'done' }));
                        }).catch(err => {
                            ws.send(JSON.stringify({ type: 'whisper', status: 'error', error: err.message }));
                        });
                    } else {
                        console.log(`${this.name}: Unknown message type: ${parsed.type}`);
                    }
                } catch (error) {
                    console.error(`${this.name}: Failed to parse incoming message:`, error);
                }
            });
        });
    }

    async sendMessage(recipient, message) {
        this.bot.whisper(recipient, message);
        console.log(`[${this.name} -> ${recipient}]: ${message}`);
    }

    async findBot(targetName) {
        const botInstance = getBotByName(targetName);
    
        if (!botInstance) {
            console.log(`Bot ${targetName} does not exist.`);
            return null;
        }
    
        console.log(`Bot ${targetName} found at ${botInstance.bot.entity.position}`);
        // console.log(Object.keys(botInstance.bot));
        return botInstance.bot; // Return the bot instance if found
    }

    async getInventory() {
        const items = this.bot.inventory.items();
        if (items.length === 0) {
            return "Inventory is empty.";
        } else {
            return items.map(item => `${item.name} (${item.count})`).join(", ");
        }
    }

    async clearObstacles(targetPos) {
        const maxTime = 10000;
        const start = Date.now();
        while (this.bot.entity.position.distanceTo(targetPos) > 2 && Date.now() - start < maxTime) {
          // Search for obstacles like leaves.
          const obstacle = this.bot.findBlock({
            matching: block =>
              block &&
              block.name &&
              block.name.toLowerCase().includes('leaf'),
            maxDistance: 3
          });
          if (obstacle) {
            await this.bot.dig(obstacle);
          } else {
            break;
          }
          await new Promise(r => setTimeout(r, 500));
        }
    }
    
    getBestWeapon() {
        const weapons = {
            netherite_sword: 6,
            diamond_sword: 4.5,
            iron_sword: 3.5,
            stone_sword: 3,
            wooden_sword: 2.5,
            golden_sword: 2
        };
        let best = null, bestScore = 0;
        for (const item of this.bot.inventory.items()) {
            const score = weapons[item.name] || 0;
            if (score > bestScore) {
            bestScore = score;
            best = item;
            }
        }
        return best ? { weapon: best, damage: weapons[best.name] } : null;
    }

    async attackBot(targetName) {
        const target = await this.findBot(targetName);
        if (!target || !target.entity)
            throw new Error(`Target "${targetName}" not found.`);
        
        const targetPos = target.entity.position;
        const { x, y, z } = targetPos;
        const goal = new GoalNear(x, y, z, 1);
        this.bot.pathfinder.setGoal(goal, false);

        const goalReached = new Promise(resolve => this.bot.once('goal_reached', resolve));
        const timeout = new Promise(resolve => setTimeout(resolve, 5000));
        await Promise.race([goalReached, timeout]);

        if (this.bot.entity.position.distanceTo(targetPos) > 2) {
            await this.clearObstacles(targetPos);
            this.bot.pathfinder.setGoal(goal, false);
            await new Promise(resolve => this.bot.once('goal_reached', resolve));
        }

        const output = this.getBestWeapon();
        if (output && (!this.bot.heldItem || this.bot.heldItem.name !== output.weapon.name)) {
            await new Promise((resolve, reject) => {
            this.bot.equip(output.weapon, 'hand', err => err ? reject(err) : resolve());
            });
        }
        const damage = output ? output.damage : 1;

        this.bot.attack(target.entity);
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.bot.chat(`/tell ${targetName} attack ${damage}`);
        return "Attack completed";
    }

    async gatherMaterials() {
        const buildingMaterials = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'hay_block'];
    
        let target = this.bot.findBlock({
            matching: block => buildingMaterials.includes(block.name),
            maxDistance: 10000
        });
    
        if (!target) return "No building materials found nearby.";
    
        console.log(`${this.bot.username} engaging target ${target.name} at ${target.position}`);
    
        try {
            const mcData = require('minecraft-data')(this.bot.version);
            const movements = new Movements(this.bot, mcData);
            movements.allowParkour = true;  
            movements.allow1by1towers = true; 
            movements.canSwim = true; 
            this.bot.pathfinder.setMovements(movements);
    
            await this.bot.pathfinder.goto(new goals.GoalBlock(target.position.x, target.position.y, target.position.z));
    
            console.log(`${this.bot.username} preparing to break ${target.name}`);
    
            // **Equip the best tool before digging**
            if (target.name.includes("log")) {
                await this.bot.equip(mcData.itemsByName.iron_axe.id, 'hand').catch(() => {});
            } else if (target.name.includes("hay")) {
                await this.bot.equip(mcData.itemsByName.shears?.id || mcData.itemsByName.iron_hoe?.id, 'hand').catch(() => {});
            }
    
            this.bot.clearControlStates();
            this.bot.setControlState('sneak', true); // Prevents movement during digging
    
            // **Try Digging & Ignore "Aborted" If Block Is Gone**
            try {
                await this.bot.dig(target, true);
            } catch (err) {
                if (err.message.includes('Digging aborted')) {
                    const checkBlock = this.bot.blockAt(target.position);
                    if (!checkBlock || checkBlock.name !== target.name) {
                        console.log(`${this.bot.username} successfully broke ${target.name} despite digging aborted message.`);
                    } else {
                        console.log(`${this.bot.username} retrying to break ${target.name}.`);
                        await this.bot.dig(target, true);
                    }
                } else {
                    throw err;
                }
            }
    
            this.bot.setControlState('sneak', false);
    
            console.log(`${this.bot.username} gathered ${target.name}!`);
            return `Gathering building materials (${target.name}) succeeded.`;
    
        } catch (error) {
            console.error(`${this.bot.username} failed to gather materials:`, error.message);
            return `Failed to gather materials: ${error.message}`;
        }
    }

    async meetUp(distance) {
        if (!this.bot.pathfinder) this.bot.loadPlugin(pathfinder);
    
        // Configure movements
        const mcData = require('minecraft-data')(this.bot.version);
        const movements = new Movements(this.bot, mcData);
        movements.canDig = true;           // Allow digging to clear obstacles
        movements.allowParkour = false;    // Keep parkour off if desired
        movements.canSwim = true;          // Allow swimming to avoid water issues
        movements.allow1by1towers = false; // Keep this off if not needed
        movements.scafoldingBlocks = [];   // No scaffolding for simplicity
    
        this.bot.pathfinder.setMovements(movements);
    
        const meetupLocation = new Vec3(-154 + distance, -42, 1);
        console.log(`${this.bot.username} heading to meetup at ${meetupLocation.x}, ${meetupLocation.y}, ${meetupLocation.z}`);
        this.bot.chat(`Heading to meetup at ${meetupLocation.x}, ${meetupLocation.y}, ${meetupLocation.z}`);
    
        // Equip a tool for digging (e.g., hand or pickaxe if available)
        const tool = this.bot.inventory.items().find(item => item.name.includes('pickaxe')) || null;
        if (tool) {
            await this.bot.equip(tool, 'hand');
            console.log(`${this.bot.username} equipped ${tool.name} for digging`);
        }
    
        return new Promise((resolve, reject) => {
            const goal = new goals.GoalBlock(meetupLocation.x, meetupLocation.y, meetupLocation.z);
            this.bot.pathfinder.setGoal(goal);
    
            // Monitor progress and handle obstacles
            let stuckTimer = null;
            const checkStuck = setInterval(async () => {
                const pos = this.bot.entity.position;
                const distanceToGoal = pos.distanceTo(meetupLocation);
    
                // If not moving significantly and not near goal, assume stuck
                if (distanceToGoal > 2 && this.bot.pathfinder.isMoving() && !stuckTimer) {
                    stuckTimer = setTimeout(async () => {
                        console.log(`${this.bot.username} seems stuck at ${pos.x}, ${pos.y}, ${pos.z}`);
                        await this.clearObstacle_meetup();
                        this.bot.pathfinder.setGoal(goal); // Reset goal after clearing
                        stuckTimer = null;
                    }, 2000); // Wait 2 seconds to confirm stuck
                } else if (distanceToGoal <= 2) {
                    clearTimeout(stuckTimer);
                    stuckTimer = null;
                }
            }, 500); // Check every 0.5 seconds
    
            this.bot.once('goal_reached', () => {
                clearInterval(checkStuck);
                console.log(`${this.bot.username} arrived at the meetup location.`);
                resolve();
            });
    
            this.bot.once('path_stop', () => {
                clearInterval(checkStuck);
                reject(new Error('Pathfinding stopped before reaching the destination.'));
            });
    
            this.bot.once('goal_error', (err) => {
                clearInterval(checkStuck);
                reject(err);
            });
        });
    }
    
    // Helper method to clear obstacles
    async clearObstacle_meetup() {
        const pos = this.bot.entity.position;
        const directions = [
            new Vec3(1, 0, 0), new Vec3(-1, 0, 0), // X axis
            new Vec3(0, 0, 1), new Vec3(0, 0, -1), // Z axis
            new Vec3(0, 1, 0), new Vec3(0, -1, 0)  // Y axis (above/below)
        ];
    
        for (const dir of directions) {
            const blockPos = pos.plus(dir);
            const block = this.bot.blockAt(blockPos);
            
            if (block && block.boundingBox === 'block') { // Solid block obstructing
                console.log(`${this.bot.username} clearing block at ${blockPos.x}, ${blockPos.y}, ${blockPos.z}`);
                try {
                    await this.bot.dig(block);
                    console.log(`${this.bot.username} cleared ${block.name}`);
                    return; // Exit after clearing one block
                } catch (err) {
                    console.log(`Failed to dig block: ${err.message}`);
                }
            }
        }
    }

    async hunt() {
        const foodAnimals = ['cow', 'pig', 'sheep', 'chicken', 'rabbit'];

        let target = this.bot.nearestEntity(entity => foodAnimals.includes(entity.name));
        if (!target) return "No food animals found nearby.";

        console.log(`${this.bot.username} engaging food target ${target.name} at ${target.position}`);

        try {
            const mcData = require('minecraft-data')(this.bot.version);
            const movements = new Movements(this.bot, mcData);
            movements.maxDropDown = 1;
            movements.allowParkour = true;
            movements.canSwim = false;  
            this.bot.pathfinder.setMovements(movements);

            this.bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true);

            const maxTime = 180000;
            const startTime = Date.now();
            let lastDistance = this.bot.entity.position.distanceTo(target.position);
            let stuckCount = 0;

            while (target.isValid && Date.now() - startTime < maxTime) {
                target = this.bot.nearestEntity(entity => foodAnimals.includes(entity.name));
                if (!target) break;

                let distance = this.bot.entity.position.distanceTo(target.position);

                if (distance < 3) {
                    this.bot.setControlState('jump', false);
                    console.log(`${this.bot.username} attacking ${target.name}`);
                    this.bot.attack(target);
                    await new Promise(resolve => setTimeout(resolve, 600));
                } else {
                    if (distance >= lastDistance - 0.5) {
                        stuckCount++;
                        if (stuckCount >= 3) {
                            console.log(`${this.bot.username} seems stuck; trying to clear obstacles.`);
                            await this.clearObstacles();
                            console.log(`${this.bot.username} recalculating path to ${target.name}.`);
                            this.bot.pathfinder.setGoal(new goals.GoalFollow(target, 1), true);
                            stuckCount = 0;
                            lastDistance = distance;
                        }
                    } else {
                        stuckCount = 0;
                    }
                    lastDistance = distance;
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            this.bot.pathfinder.stop();

            if (!target.isValid) {
                console.log(`${this.bot.username} defeated ${target.name}!`);
                return `Hunting for food (${target.name}) succeeded.`;
            } else if (Date.now() - startTime >= maxTime) {
                return `Failed to defeat ${target.name} within timeout.`;
            } else {
                return `Lost target ${target.name} before it could be killed.`;
            }
        } catch (error) {
            console.error(`${this.bot.username} failed to hunt for food:`, error.message);
            return `Failed to hunt for food: ${error.message}`;
        }
    }

    async clearObstacles() {
        console.log(`${this.bot.username} is stuck, attempting to clear obstacles...`);

        const botPos = this.bot.entity.position;
        const offsets = [
            { x: 0, y: 1, z: 0 }, // Block above
            { x: 0, y: 0, z: 1 }, // Block in front
            { x: 0, y: -1, z: 0 }, // Block below (if trapped)
        ];

        for (const offset of offsets) {
            const block = this.bot.blockAt(botPos.offset(offset.x, offset.y, offset.z));

            if (block && block.name.includes('leaves')) {
                console.log(`${this.bot.username} found leaves blocking movement: ${block.name}, breaking...`);
                try {
                    await this.bot.dig(block);
                    console.log(`${this.bot.username} cleared the leaves.`);
                    return; // Exit early if the bot digs successfully
                } catch (error) {
                    console.error(`${this.bot.username} failed to break leaves:`, error.message);
                }
            }
        }

        // If no leaves were detected, try jumping to get unstuck
        console.log(`${this.bot.username} is still stuck, attempting to jump.`);
        this.bot.setControlState('jump', true);
        await new Promise(resolve => setTimeout(resolve, 500));
        this.bot.setControlState('jump', false);
    }

    async ensureAboveGround() {
        const botY = this.bot.entity.position.y;
        if (botY < 62) {  // Adjust based on world terrain
            console.log(`${this.bot.username} is underground at Y=${botY}, attempting to escape.`);

            let attempts = 0;
            while (this.bot.entity.position.y < 62 && attempts < 20) { 
                // Check if there's a block above
                const blockAbove = this.bot.blockAt(this.bot.entity.position.offset(0, 1, 0));

                if (blockAbove && blockAbove.boundingBox === 'block') {
                    console.log(`${this.bot.username} is blocked, digging up.`);
                    await this.bot.dig(blockAbove);
                } else {
                    console.log(`${this.bot.username} jumping to get to surface.`);
                    this.bot.setControlState('jump', true);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    this.bot.setControlState('jump', false);
                }

                attempts++;
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            console.log(`${this.bot.username} should be above ground now.`);
        }
    }

    async goUnderground(depth = 10) {
        console.log(`${this.bot.username} is digging underground...`);

        const botPos = this.bot.entity.position;

        // Ensure there's no lava or water below before digging
        const checkBlock = (pos) => {
            const block = this.bot.blockAt(pos);
            return block && (block.name.includes('lava') || block.name.includes('water'));
        };

        // Move bot to a safe spot before digging
        const safePosition = botPos.floored();
        if (checkBlock(safePosition.offset(0, -1, 0))) {
            console.log(`${this.bot.username} found lava/water below. Searching for a safer spot.`);
            return "Unsafe to dig here!";
        }

        try {
            for (let i = 0; i < depth; i++) {
                const blockBelow = this.bot.blockAt(this.bot.entity.position.offset(0, -1, 0));

                if (!blockBelow || blockBelow.name === 'air') {
                    console.log(`${this.bot.username} reached an air pocket underground.`);
                    break;
                }

                console.log(`${this.bot.username} digging down at Y=${this.bot.entity.position.y}`);
                await this.bot.dig(blockBelow);
                
                // Step down after digging
                this.bot.setControlState('jump', false);
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            console.log(`${this.bot.username} reached target depth.`);
            return "Successfully dug underground!";
        } catch (error) {
            console.error(`${this.bot.username} encountered an error while digging underground:`, error.message);
            return `Failed to dig underground: ${error.message}`;
        }
    }


}

module.exports = Bot;