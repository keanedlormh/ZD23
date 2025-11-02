/**
 * server/pathfinding.js - NUEVO ARCHIVO
 * Implementación del algoritmo A* para navegación de zombies
 *
 * *** ACTUALIZADO: Se eliminaron las funciones 'smoothPath' y 'hasLineOfSight'
 * ya que causaban un movimiento de "zigzag" al crear atajos angulares.
 * Ahora solo se usa el camino puro de A* (basado en la cuadrícula).
 */

class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(item, priority) {
        this.items.push({ item, priority });
        this.items.sort((a, b) => a.priority - b.priority);
    }

    dequeue() {
        return this.items.shift()?.item;
    }

    isEmpty() {
        return this.items.length === 0;
    }
}

class Pathfinder {
    constructor(grid, cellSize) {
        this.grid = grid; // Matriz de navegación (0 = libre, 1 = muro)
        this.cellSize = cellSize;
        this.rows = grid.length;
        this.cols = grid[0].length;
    }

    /**
     * Calcula la distancia Manhattan entre dos puntos
     */
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * Obtiene los vecinos válidos de una celda
     */
    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 },  // Arriba
            { x: 1, y: 0 },   // Derecha
            { x: 0, y: 1 },   // Abajo
            { x: -1, y: 0 },  // Izquierda
            // Diagonales (opcional, pero mejora el movimiento)
            { x: 1, y: -1 },  // Arriba-Derecha
            { x: 1, y: 1 },   // Abajo-Derecha
            { x: -1, y: 1 },  // Abajo-Izquierda
            { x: -1, y: -1 }  // Arriba-Izquierda
        ];

        for (const dir of directions) {
            const newX = node.x + dir.x;
            const newY = node.y + dir.y;

            // Verificar límites
            if (newX >= 0 && newX < this.cols && newY >= 0 && newY < this.rows) {
                // Verificar que sea transitable
                if (this.grid[newY][newX] === 0) {
                    // Para movimientos diagonales, verificar que los lados también estén libres
                    if (dir.x !== 0 && dir.y !== 0) {
                        const checkX = this.grid[node.y][newX] === 0;
                        const checkY = this.grid[newY][node.x] === 0;
                        if (checkX && checkY) {
                            neighbors.push({ x: newX, y: newY });
                        }
                    } else {
                        neighbors.push({ x: newX, y: newY });
                    }
                }
            }
        }

        return neighbors;
    }

    /**
     * Algoritmo A* para encontrar el camino más corto
     * @param {Object} start - Posición de inicio {x, y} en coordenadas de grid
     * @param {Object} goal - Posición objetivo {x, y} en coordenadas de grid
     * @returns {Array} - Array de posiciones {x, y} que forman el camino, o null si no hay camino
     */
    findPath(start, goal) {
        // Validar posiciones
        if (!this.isValid(start) || !this.isValid(goal)) {
            return null;
        }

        // Si estamos en el objetivo
        if (start.x === goal.x && start.y === goal.y) {
            return [start];
        }

        const openSet = new PriorityQueue();
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const startKey = `${start.x},${start.y}`;
        const goalKey = `${goal.x},${goal.y}`;

        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, goal));
        openSet.enqueue(start, fScore.get(startKey));

        let iterations = 0;
        const maxIterations = 1000; // Límite de seguridad

        while (!openSet.isEmpty() && iterations < maxIterations) {
            iterations++;
            const current = openSet.dequeue();
            const currentKey = `${current.x},${current.y}`;

            // ¿Llegamos al objetivo?
            if (currentKey === goalKey) {
                return this.reconstructPath(cameFrom, current);
            }

            closedSet.add(currentKey);

            // Explorar vecinos
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;

                if (closedSet.has(neighborKey)) {
                    continue;
                }

                // Costo de movimiento (diagonal cuesta más)
                const isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
                const moveCost = isDiagonal ? 1.414 : 1; // √2 ≈ 1.414

                const tentativeGScore = gScore.get(currentKey) + moveCost;

                if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
                    openSet.enqueue(neighbor, fScore.get(neighborKey));
                }
            }
        }

        // No se encontró camino
        return null;
    }

    /**
     * Reconstruye el camino desde el objetivo hasta el inicio
     */
    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = `${current.x},${current.y}`;

        while (cameFrom.has(currentKey)) {
            current = cameFrom.get(currentKey);
            path.unshift(current);
            currentKey = `${current.x},${current.y}`;
        }

        return path;
    }

    /**
     * Verifica si una posición es válida y transitable
     */
    isValid(pos) {
        if (!pos) return false;
        return pos.x >= 0 && pos.x < this.cols &&
               pos.y >= 0 && pos.y < this.rows &&
               this.grid[pos.y][pos.x] === 0;
    }
}

module.exports = Pathfinder;