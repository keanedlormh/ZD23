/**
 * client/js/entities.js
 * Clases de las entidades del juego: Player, Zombie, Bullet.
 */

// Importa config y Node desde utils.js
import { config } from './utils.js'; 

// Importa variables y funciones del motor (game.js).
import { 
    ctx, 
    gameMap, 
    player, 
    zombies, 
    bullets, 
    zombiesInWave, // Importamos la variable, aunque sea con let/export
    score, 
    kills,
    gameOver, 
    updateHUD, 
    updateHealthBar 
} from './game.js';

/**
 * Clase principal del jugador.
 */
export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.speed = config.playerSpeed;
        this.health = 100;
        this.maxHealth = 100;
        this.moveX = 0;
        this.moveY = 0;
        this.shootX = 0;
        this.shootY = 0;
        this.lastShot = 0;
    }
    
    update() {
        // 1. Manejo del movimiento
        if (this.moveX !== 0 || this.moveY !== 0) {
            const mag = Math.sqrt(this.moveX * this.moveX + this.moveY * this.moveY);
            const moveVecX = this.moveX / mag;
            const moveVecY = this.moveY / mag;

            const newX = this.x + moveVecX * this.speed;
            const newY = this.y + moveVecY * this.speed;
            
            const checks = [
                {dx: 0, dy: 0}, 
                {dx: this.radius - 1, dy: 0}, {dx: -(this.radius - 1), dy: 0},
                {dx: 0, dy: this.radius - 1}, {dx: 0, dy: -(this.radius - 1)}
            ];

            let canMoveX = true;
            for (const {dx, dy} of checks) {
                if (gameMap.isWall(newX + dx, this.y + dy)) {
                    canMoveX = false;
                    break;
                }
            }

            let canMoveY = true;
            for (const {dx, dy} of checks) {
                if (gameMap.isWall(this.x + dx, newY + dy)) {
                    canMoveY = false;
                    break;
                }
            }

            if (canMoveX) this.x = newX;
            if (canMoveY) this.y = newY;
        }
        
        // 2. Disparo automático si el joystick de disparo está activo
        if ((this.shootX !== 0 || this.shootY !== 0) && Date.now() - this.lastShot > 1000 / config.fireRate) {
            bullets.push(new Bullet(this.x, this.y, this.shootX, this.shootY));
            this.lastShot = Date.now();
        }
    }
    
    draw(offsetX, offsetY) {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(this.x - offsetX, this.y - offsetY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Dirección de disparo visual
        if (this.shootX !== 0 || this.shootY !== 0) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x - offsetX, this.y - offsetY);
            ctx.lineTo(this.x - offsetX + this.shootX * 25, this.y - offsetY + this.shootY * 25);
            ctx.stroke();
        }
    }
    
    damage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            gameOver(); // Llama a la función importada
        }
        updateHealthBar(); // Llama a la función importada
    }
}


/**
 * Clase de los enemigos Zombie.
 */
export class Zombie {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = type === 'fast' ? 12 : 14;
        this.speed = type === 'fast' ? 1.5 : 0.8;
        this.health = type === 'tank' ? 3 : 1;
        this.damage = type === 'tank' ? 15 : 10;
        this.color = type === 'fast' ? '#ff6666' : type === 'tank' ? '#cc0000' : '#ff0000';
        this.lastAttack = 0;

        this.path = []; 
        this.pathUpdateTimer = 0;
        this.pathUpdateInterval = 60;
    }
    
    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 1. Lógica de ataque
        if (dist < this.radius + player.radius) {
            if (Date.now() - this.lastAttack > 1000 / (config.difficulty * 0.5)) {
                player.damage(this.damage);
                this.lastAttack = Date.now();
            }
            return; 
        }
        
        // 2. Lógica de Pathfinding
        this.pathUpdateTimer++;
        
        if (this.pathUpdateTimer >= this.pathUpdateInterval || this.path.length === 0) {
            this.path = gameMap.findPathAStar(this, player);
            this.pathUpdateTimer = 0;
        }
        
        // 3. Moverse hacia el siguiente punto de la ruta
        if (this.path && this.path.length > 0) {
            const target = this.path[0];
            const moveX = target.x - this.x;
            const moveY = target.y - this.y;
            const moveDist = Math.sqrt(moveX * moveX + moveY * moveY);
            
            const normalizedSpeed = this.speed * (config.difficulty * 0.5);
            
            if (moveDist < normalizedSpeed) {
                this.x = target.x;
                this.y = target.y;
                this.path.shift();
            } else {
                this.x += (moveX / moveDist) * normalizedSpeed;
                this.y += (moveY / moveDist) * normalizedSpeed;
            }
        } 
    }
    
    draw(offsetX, offsetY) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - offsetX, this.y - offsetY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Dibujar ojos
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - offsetX - 5, this.y - offsetY - 3, 3, 3);
        ctx.fillRect(this.x - offsetX + 2, this.y - offsetY - 3, 3, 3);
    }
    
    /**
     * Aplica daño al zombie y devuelve true si muere.
     */
    hit() {
        this.health--;
        if (this.health <= 0) {
            // Actualizar variables de estado del juego (requiere manipulación por referencia o exportación de variables)
            // Ya que estas son variables `let` exportadas, el motor (game.js) se encargará de actualizar el array `zombies`
            // pero las variables primitivas (score, kills, zombiesInWave) NO se pueden modificar así.
            // La actualización se hará en game.js, aquí solo devolvemos el estado:
            return true;
        }
        return false;
    }
}


/**
 * Clase de los proyectiles o balas.
 */
export class Bullet {
    constructor(x, y, dirX, dirY) {
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.speed = 8;
        this.radius = 4;
        this.dead = false;
    }
    
    update() {
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;
        
        // Colisión con paredes
        if (gameMap.isWall(this.x, this.y)) {
            this.dead = true;
        }
        
        // Colisión con zombies
        zombies.forEach(zombie => {
            if (this.dead) return; 
            
            const dx = this.x - zombie.x;
            const dy = this.y - zombie.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < this.radius + zombie.radius) {
                if (zombie.hit()) {
                    // La eliminación y la actualización de score/kills se manejará en game.js
                    // donde se filtran los arrays y se manipulan las variables exportadas.
                    
                    // Dado que no podemos modificar 'score' ni 'kills' desde aquí al ser exportadas
                    // como primitivas, usaremos un truco en game.js para manejarlo.
                }
                this.dead = true;
            }
        });
    }
    
    draw(offsetX, offsetY) {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x - offsetX, this.y - offsetY, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
