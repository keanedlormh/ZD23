/**
 * client/js/game.js
 * Lógica principal del juego, GameLoop, MapGenerator y gestión de estado.
 */

// Importa entidades y utilidades
import { config, Node, VirtualJoystick } from './utils.js'; 
import { Player, Zombie, Bullet } from './entities.js'; 

// Variables globales del motor y estado (exportadas para entities.js)
export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');
export const minimap = document.getElementById('minimap');
export const minimapCtx = minimap.getContext('2d');

let gameState = 'menu';

// Exportamos estas variables con 'let' para que 'entities.js' las vea, 
// pero SÓLO se pueden modificar aquí. Las entidades acceden a ellas para lectura.
export let score = 0;
export let kills = 0;
export let wave = 1;
export let zombiesInWave = 0;
export let zombiesSpawned = 0;

export let gameMap;
export let player;
export let zombies = [];
export let bullets = [];
let moveJoystick;
let shootJoystick;

// Ajustar canvas al tamaño de la ventana
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);


/**
 * Generador y gestor del mapa laberíntico.
 */
class MapGenerator {
    constructor(size) {
        this.size = size;
        this.cellSize = 40;
        this.map = [];
        this.rooms = [];
        this.generate();
    }
    
    generate() {
        for (let y = 0; y < this.size; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.size; x++) {
                this.map[y][x] = 1; 
            }
        }
        
        const numRooms = Math.floor(this.size / 5);
        for (let i = 0; i < numRooms; i++) {
            const w = 4 + Math.floor(Math.random() * 6);
            const h = 4 + Math.floor(Math.random() * 6);
            const x = 2 + Math.floor(Math.random() * (this.size - w - 4));
            const y = 2 + Math.floor(Math.random() * (this.size - h - 4));
            
            this.createRoom(x, y, w, h);
            this.rooms.push({x, y, w, h, cx: x + Math.floor(w/2), cy: y + Math.floor(h/2)});
        }
        
        for (let i = 0; i < this.rooms.length - 1; i++) {
            this.createCorridor(
                this.rooms[i].cx, this.rooms[i].cy,
                this.rooms[i + 1].cx, this.rooms[i + 1].cy
            );
        }
        
        const center = Math.floor(this.size / 2);
        this.createRoom(center - 3, center - 3, 7, 7);
        this.spawnPoint = {x: center * this.cellSize + this.cellSize/2, y: center * this.cellSize + this.cellSize/2};
    }
    
    createRoom(x, y, w, h) {
        for (let j = y; j < y + h && j < this.size; j++) {
            for (let i = x; i < x + w && i < this.size; i++) {
                this.map[j][i] = 0;
            }
        }
    }
    
    createCorridor(x1, y1, x2, y2) {
        let x = x1, y = y1;
        while (x !== x2) {
            this.map[y][x] = 0;
            if (y > 0) this.map[y-1][x] = 0;
            if (y < this.size - 1) this.map[y+1][x] = 0;
            x += x < x2 ? 1 : -1;
        }
        while (y !== y2) {
            this.map[y][x] = 0;
            if (x > 0) this.map[y][x-1] = 0;
            if (x < this.size - 1) this.map[y][x+1] = 0;
            y += y < y2 ? 1 : -1;
        }
    }
    
    isWall(x, y) {
        const gx = Math.floor(x / this.cellSize);
        const gy = Math.floor(y / this.cellSize);
        if (gx < 0 || gx >= this.size || gy < 0 || gy >= this.size) return true;
        return this.map[gy][gx] === 1;
    }
    
    getRandomOpenSpot() {
        let x, y, gx, gy;
        do {
            gx = Math.floor(Math.random() * this.size);
            gy = Math.floor(Math.random() * this.size);
        } while (this.map[gy][gx] === 1 || this.isCloseToPlayer(gx, gy));
        
        x = gx * this.cellSize + this.cellSize / 2;
        y = gy * this.cellSize + this.cellSize / 2;
        return {x, y};
    }

    isCloseToPlayer(gx, gy) {
        if (!player) return false;
        const px = Math.floor(player.x / this.cellSize);
        const py = Math.floor(player.y / this.cellSize);
        const distSq = (gx - px) * (gx - px) + (gy - py) * (gy - py);
        return distSq < 100;
    }
    
    draw(offsetX, offsetY) {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const px = x * this.cellSize - offsetX;
                const py = y * this.cellSize - offsetY;
                
                if (px > -this.cellSize && px < canvas.width + this.cellSize &&
                    py > -this.cellSize && py < canvas.height + this.cellSize) {
                    
                    ctx.fillStyle = this.map[y][x] === 1 ? '#333' : '#1a1a1a';
                    ctx.fillRect(px, py, this.cellSize, this.cellSize);
                    
                    if (this.map[y][x] === 1) { 
                         ctx.strokeStyle = '#222';
                         ctx.strokeRect(px, py, this.cellSize, this.cellSize);
                    }
                }
            }
        }
    }
    
    drawMinimap(player, zombies) {
        minimapCtx.fillStyle = '#000';
        minimapCtx.fillRect(0, 0, minimap.width, minimap.height);
        
        const scale = minimap.width / (this.size * this.cellSize);
        
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                minimapCtx.fillStyle = this.map[y][x] === 1 ? '#666' : '#222';
                minimapCtx.fillRect(x * this.cellSize * scale, y * this.cellSize * scale, 
                                  this.cellSize * scale, this.cellSize * scale);
            }
        }
        
        minimapCtx.fillStyle = '#00ff00';
        minimapCtx.beginPath();
        minimapCtx.arc(player.x * scale, player.y * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
        
        minimapCtx.fillStyle = '#ff0000';
        zombies.forEach(zombie => {
            minimapCtx.beginPath();
            minimapCtx.arc(zombie.x * scale, zombie.y * scale, 2, 0, Math.PI * 2);
            minimapCtx.fill();
        });
    }

    heuristic(node, target) {
        return Math.abs(node.x - target.x) + Math.abs(node.y - target.y);
    }

    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            {dx: 0, dy: -1}, {dx: 0, dy: 1},  
            {dx: -1, dy: 0}, {dx: 1, dy: 0}   
        ];
        
        for (const {dx, dy} of directions) {
            const nx = node.x + dx;
            const ny = node.y + dy;
            
            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size && this.map[ny][nx] === 0) {
                neighbors.push({x: nx, y: ny});
            }
        }
        return neighbors;
    }

    findPathAStar(start, end) {
        const startGrid = {
            x: Math.floor(start.x / this.cellSize), 
            y: Math.floor(start.y / this.cellSize)
        };
        const endGrid = {
            x: Math.floor(end.x / this.cellSize), 
            y: Math.floor(end.y / this.cellSize)
        };

        if (this.map[startGrid.y][startGrid.x] === 1 || this.map[endGrid.y][endGrid.x] === 1) return null;

        let openList = [new Node(startGrid.x, startGrid.y)];
        let closedList = new Set(); 
        const nodeMap = new Map();
        nodeMap.set(`${startGrid.x},${startGrid.y}`, openList[0]);

        while (openList.length > 0) {
            openList.sort((a, b) => a.f - b.f);
            let currentNode = openList.shift();

            const currentKey = `${currentNode.x},${currentNode.y}`;
            closedList.add(currentKey);

            if (currentNode.x === endGrid.x && currentNode.y === endGrid.y) {
                const path = [];
                let temp = currentNode;
                while (temp) {
                    path.push({
                        x: temp.x * this.cellSize + this.cellSize / 2, 
                        y: temp.y * this.cellSize + this.cellSize / 2
                    });
                    temp = temp.parent;
                }
                return path.reverse().slice(1); 
            }

            for (const neighborPos of this.getNeighbors(currentNode)) {
                const neighborKey = `${neighborPos.x},${neighborPos.y}`;

                if (closedList.has(neighborKey)) continue;

                let neighborNode = nodeMap.get(neighborKey);
                const newG = currentNode.g + 1; 

                if (!neighborNode) {
                    neighborNode = new Node(neighborPos.x, neighborPos.y);
                    neighborNode.g = newG;
                    neighborNode.h = this.heuristic(neighborNode, endGrid);
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    neighborNode.parent = currentNode;
                    nodeMap.set(neighborKey, neighborNode);
                    openList.push(neighborNode);
                } else if (newG < neighborNode.g) {
                    neighborNode.g = newG;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    neighborNode.parent = currentNode;
                    if (!openList.includes(neighborNode)) {
                        openList.push(neighborNode);
                    }
                }
            }
        }
        
        return null;
    }
}


// --- Lógica del Juego y Gestión de Estado ---

function addGlobalJoystickListeners() {
    window.addEventListener('touchmove', (e) => {
        if (moveJoystick) moveJoystick.handleTouchMove(e);
        if (shootJoystick) shootJoystick.handleTouchMove(e);
    }, {passive: false});

    window.addEventListener('touchend', (e) => {
        if (moveJoystick) moveJoystick.handleTouchEnd(e);
        if (shootJoystick) shootJoystick.handleTouchEnd(e);
    }, {passive: false});

    window.addEventListener('touchcancel', (e) => {
        if (moveJoystick) moveJoystick.handleTouchEnd(e); 
        if (shootJoystick) shootJoystick.handleTouchEnd(e);
    }, {passive: false});
}
addGlobalJoystickListeners();

function initGame() {
    gameMap = new MapGenerator(config.mapSize);
    player = new Player(gameMap.spawnPoint.x, gameMap.spawnPoint.y);
    player.speed = config.playerSpeed;
    zombies.length = 0; // Reiniciar array de zombies
    bullets.length = 0; // Reiniciar array de balas
    score = 0;
    kills = 0;
    wave = 1;
    
    moveJoystick = new VirtualJoystick(
        document.getElementById('moveJoystick'),
        document.getElementById('moveKnob')
    );
    
    shootJoystick = new VirtualJoystick(
        document.getElementById('shootJoystick'),
        document.getElementById('shootKnob')
    );
    
    startWave();
    updateHUD();
    updateHealthBar();
}

function startWave() {
    zombiesInWave = Math.floor(5 + wave * 3 * (config.difficulty * 0.75));
    zombiesSpawned = 0;
    updateHUD();
}

function spawnZombie() {
    if (zombiesSpawned >= zombiesInWave) return;
    
    const spawnPos = gameMap.getRandomOpenSpot();

    let type = 'normal';
    if (wave >= 3 && Math.random() < 0.25 * config.difficulty) type = 'fast';
    if (wave >= 5 && Math.random() < 0.15 * config.difficulty) type = 'tank';
    
    zombies.push(new Zombie(spawnPos.x, spawnPos.y, type));
    zombiesSpawned++;
    updateHUD();
}

/**
 * Actualiza el Head-Up Display (puntuación, oleada, kills).
 */
export function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('kills').textContent = kills;
    document.getElementById('wave').textContent = wave;
    document.getElementById('zombiesLeft').textContent = zombiesInWave - zombies.length; 
}

/**
 * Actualiza la barra de salud visual y numérica.
 */
export function updateHealthBar() {
    if (!player) return;
    const percentage = (player.health / player.maxHealth) * 100;
    document.getElementById('healthFill').style.width = percentage + '%';
    document.getElementById('healthText').textContent = Math.ceil(player.health) + ' / ' + player.maxHealth;
}


// Game loop
let lastSpawn = 0;
let spawnInterval = 2000;
function gameLoop() {
    if (gameState !== 'playing') return;
    
    // Limpiar canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calcular offset de cámara
    const offsetX = player.x - canvas.width / 2;
    const offsetY = player.y - canvas.height / 2;
    
    // Dibujar mapa
    gameMap.draw(offsetX, offsetY);
    
    // Actualizar jugador con el input de los joysticks
    const moveVec = moveJoystick.getVector();
    player.moveX = moveVec.x;
    player.moveY = moveVec.y;
    
    const shootVec = shootJoystick.getVector();
    player.shootX = shootVec.x;
    player.shootY = shootVec.y;
    
    player.update();
    player.draw(offsetX, offsetY);
    
    // Actualizar y dibujar balas
    const hitZombies = [];
    
    // Lógica de colisión de balas y actualización de arrays/score
    bullets.forEach(bullet => {
        bullet.update();
        if (bullet.dead) {
            // Recorremos de nuevo los zombies para ver quién murió en esta bala.
            zombies.forEach(z => {
                if (bullet.x > z.x - z.radius && bullet.x < z.x + z.radius &&
                    bullet.y > z.y - z.radius && bullet.y < z.y + z.radius) {
                        if (z.health <= 0 && !hitZombies.includes(z)) {
                            hitZombies.push(z);
                        }
                }
            });
        }
    });

    // Eliminar zombies muertos y actualizar score (Hecho aquí, en el módulo principal)
    hitZombies.forEach(zombie => {
        score += zombie.type === 'tank' ? 30 : zombie.type === 'fast' ? 15 : 10;
        kills++;
    });
    zombies = zombies.filter(z => !hitZombies.includes(z));
    
    bullets = bullets.filter(b => !b.dead);
    bullets.forEach(bullet => bullet.draw(offsetX, offsetY));

    // Gestión del spawn de zombies
    spawnInterval = Math.max(500, 2000 - (wave * 50) - (config.difficulty * 100)); 
    
    if (Date.now() - lastSpawn > spawnInterval && zombiesSpawned < zombiesInWave) {
        spawnZombie();
        lastSpawn = Date.now();
    }
    
    // Actualizar y dibujar zombies
    zombies.forEach(zombie => {
        zombie.update();
        zombie.draw(offsetX, offsetY);
    });
    
    // Comprobar fin de oleada
    if (zombiesSpawned >= zombiesInWave && zombies.length === 0) {
        wave++;
        player.health = player.maxHealth;
        updateHealthBar();
        startWave();
    }
    
    // Dibujar minimapa
    gameMap.drawMinimap(player, zombies);
    
    updateHUD(); // Asegurar que el HUD se actualiza después de las muertes
    
    requestAnimationFrame(gameLoop);
}


// --- Gestión de Menús y Transiciones de Estado (Expuestas al HTML) ---

// Las funciones llamadas directamente desde el HTML (onclick) deben estar en el ámbito global (window)
function startGame() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('moveJoystick').classList.remove('hidden');
    document.getElementById('shootJoystick').classList.remove('hidden');
    
    gameState = 'playing';
    initGame();
    gameLoop();
}
window.startGame = startGame; 

function showSettings() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('settingsMenu').classList.remove('hidden');
    updateSettings();
}
window.showSettings = showSettings;

function hideSettings() {
    document.getElementById('settingsMenu').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
}
window.hideSettings = hideSettings;

function updateSettings() {
    const difficultyEl = document.getElementById('difficulty');
    const mapSizeEl = document.getElementById('mapSize');
    const playerSpeedEl = document.getElementById('playerSpeed');
    const fireRateEl = document.getElementById('fireRate');
    
    config.difficulty = parseInt(difficultyEl.value);
    config.mapSize = parseInt(mapSizeEl.value);
    config.playerSpeed = parseFloat(playerSpeedEl.value);
    config.fireRate = parseInt(fireRateEl.value);
    
    document.getElementById('difficultyValue').textContent = 
        config.difficulty === 1 ? 'Fácil' : config.difficulty === 2 ? 'Normal' : 'Difícil';
    
    document.getElementById('mapSizeValue').textContent = 
        config.mapSize === 30 ? 'Pequeño' : config.mapSize === 50 ? 'Mediano' : 'Grande';
    
    document.getElementById('playerSpeedValue').textContent = config.playerSpeed;
    
    document.getElementById('fireRateValue').textContent = 
        config.fireRate >= 15 ? 'Rápida' : config.fireRate >= 10 ? 'Normal' : 'Lenta';
    
    if (gameState === 'playing' && player) {
        player.speed = config.playerSpeed;
    }
}
window.updateSettings = updateSettings;

export function gameOver() {
    gameState = 'gameOver';
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalWave').textContent = wave;
    document.getElementById('finalKills').textContent = kills;
    
    document.getElementById('moveJoystick').classList.add('hidden');
    document.getElementById('shootJoystick').classList.add('hidden');
    document.getElementById('gameOverMenu').classList.remove('hidden');
}

function restartGame() {
    startGame();
}
window.restartGame = restartGame;

function backToMenu() {
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    gameState = 'menu';
}
window.backToMenu = backToMenu;

// Asegurar que la configuración inicial se muestra al cargar
document.addEventListener('DOMContentLoaded', updateSettings);
