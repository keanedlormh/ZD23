/**
 * client/js/utils.js
 * Clases y datos auxiliares, exportados como módulos.
 */

// Exporta el objeto config directamente.
export const config = {
    difficulty: 2,
    mapSize: 50,
    playerSpeed: 3,
    fireRate: 10
};

/**
 * Clase auxiliar para el algoritmo A* (Pathfinding).
 * Representa un nodo en la cuadrícula del mapa.
 */
export class Node {
    constructor(x, y, g = 0, h = 0, parent = null) {
        this.x = x;
        this.y = y;
        this.g = g; // Coste desde el inicio
        this.h = h; // Heurística hasta el final
        this.f = g + h; // Coste total (G + H)
        this.parent = parent;
    }
}

/**
 * Clase para manejar el movimiento del jugador en dispositivos táctiles.
 */
export class VirtualJoystick {
    constructor(element, knobElement) {
        this.element = element;
        this.knob = knobElement;
        this.active = false;
        this.touchId = null; // ID del toque para multitouch
        this.x = 0;
        this.y = 0;
        this.centerX = 60;
        this.centerY = 60;
        this.maxDistance = 35;
        
        // Solo escucha 'touchstart' en el elemento del joystick
        this.element.addEventListener('touchstart', this.onTouchStart.bind(this), {passive: false});
    }
    
    onTouchStart(e) {
        if (this.active) return;
        
        // Buscar el toque que comenzó dentro del elemento
        const touch = Array.from(e.changedTouches).find(t => {
            const rect = this.element.getBoundingClientRect();
            return t.clientX >= rect.left && t.clientX <= rect.right &&
                   t.clientY >= rect.top && t.clientY <= rect.bottom;
        });
        
        if (touch) {
            e.preventDefault();
            this.active = true;
            this.touchId = touch.identifier;
            this.updatePosition(touch);
        }
    }
    
    handleTouchMove(e) {
        if (!this.active || this.touchId === null) return;
        
        const touch = Array.from(e.changedTouches).find(t => t.identifier === this.touchId);
        
        if (touch) {
            e.preventDefault();
            this.updatePosition(touch);
        }
    }
    
    handleTouchEnd(e) {
        if (!this.active || this.touchId === null) return;

        const touchEnded = Array.from(e.changedTouches).find(t => t.identifier === this.touchId);

        if (touchEnded) {
            this.active = false;
            this.touchId = null;
            this.x = 0;
            this.y = 0;
            this.knob.style.transform = 'translate(-50%, -50%)';
        }
    }
    
    updatePosition(touch) {
        const rect = this.element.getBoundingClientRect();
        const deltaX = touch.clientX - (rect.left + this.centerX);
        const deltaY = touch.clientY - (rect.top + this.centerY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.maxDistance) {
            this.x = (deltaX / distance) * this.maxDistance;
            this.y = (deltaY / distance) * this.maxDistance;
        } else {
            this.x = deltaX;
            this.y = deltaY;
        }
        
        this.knob.style.transform = `translate(calc(-50% + ${this.x}px), calc(-50% + ${this.y}px))`;
    }
    
    /**
     * Devuelve el vector de dirección normalizado.
     */
    getVector() {
        if (!this.active) return {x: 0, y: 0};
        const distance = Math.sqrt(this.x * this.x + this.y * this.y);
        if (distance === 0) return {x: 0, y: 0};
        return {
            x: this.x / distance,
            y: this.y / distance
        };
    }
}
