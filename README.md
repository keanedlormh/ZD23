# ZD23
Zombie Defense 23

Zombie Shooter Multijugador (v1.4)
Este es un shooter multijugador top-down en tiempo real construido con Node.js, Express y Socket.io. El juego utiliza un servidor autoritativo, donde toda la lógica del juego, la física y el estado son gestionados por el servidor, y el cliente se encarga únicamente de renderizar la información recibida.
Características Principales
 * Multijugador en Tiempo Real: Sistema de salas (crear, buscar, unirse por ID).
 * Servidor Autoritativo: El cliente solo envía entradas (input); el servidor simula el juego y envía "snapshots" del estado.
 * Mecánica de "Núcleo Zombie": El objetivo no es solo sobrevivir, sino destruir el nexo enemigo en cada oleada.
 * Sistema de Oleadas Dinámico: Las oleadas escalan en dificultad basándose en las reglas definidas por el anfitrión.
 * Partidas Personalizables: El anfitrión de la sala configura la dificultad de la partida (vida, daño, velocidad, escalado de oleadas, etc.).
 * Unirse a Partidas en Curso: Los jugadores pueden unirse a una partida ya iniciada (aparecen en la siguiente oleada).
 * Sistema de Reaparición: Los jugadores caídos reaparecen al inicio de la siguiente oleada si al menos un compañero sobrevive.
 * Controles Duales: Detección automática de controles táctiles (joystick en pantalla) o teclado/ratón.
Mecánica del Juego (v1.4)
El objetivo es sobrevivir el mayor número de oleadas posible colaborando con otros jugadores.
 * Inicio de Oleada: La oleada comienza cuando un Núcleo Zombie aparece en un lugar aleatorio del mapa, lejos de los jugadores.
 * Curación y Reaparición: En el momento en que aparece el núcleo, todos los jugadores vivos recuperan el 100% de su vida. Todos los jugadores muertos (o que se unieron como espectadores) reaparecen cerca de un compañero vivo.
 * Fase 1 (Ráfaga): El Núcleo entra en "Fase 1". Comienza a generar una cantidad limitada de zombies a un ritmo muy rápido.
   * Configurable: Zombies Fase 1 y Aum. Zombies Fase 1.
 * Fase 2 (Asedio): Una vez que el Núcleo ha generado todos los zombies de la Fase 1, cambia a "Fase 2". Ahora genera zombies de forma ilimitada a un ritmo más lento hasta que es destruido.
   * Configurable: Ritmo Fase 2 (ms).
 * Destrucción del Núcleo: Los jugadores deben destruir el Núcleo. Una vez destruido, deja de generar zombies.
 * Fin de Oleada: La oleada termina oficialmente cuando el Núcleo ha sido destruido Y todos los zombies restantes han sido eliminados. Se inicia la siguiente oleada (vuelta al Paso 1).
 * Game Over: La partida termina si todos los jugadores en la partida están muertos al mismo tiempo.
Arquitectura del Código
El proyecto está dividido en una arquitectura clásica de cliente-servidor.
Lado Servidor (server/)
 * server.js: Es el punto de entrada. Utiliza Express para servir los archivos estáticos (HTML, CSS, JS del cliente) y Socket.io para gestionar las conexiones. Maneja la lógica de "alto nivel": creación de salas, unión de jugadores, desconexiones y la instanciación de GameLogic para cada partida.
 * gameLogic.js: Es el "cerebro" autoritativo del juego.
   * Contiene el bucle principal del juego (update()) que se ejecuta a SERVER_TICK_RATE (30 veces por segundo).
   * Gestiona el estado de todas las entidades (Jugadores, Zombies, Balas, Núcleo).
   * Maneja la física (movimiento, colisiones "deslizantes") y la lógica de combate.
   * Contiene la clase ServerZombieCore que gestiona la lógica de 2 fases de aparición.
   * Contiene la lógica de reaparición y curación al inicio de cada oleada (spawnNewCore()).
 * pathfinding.js: Implementa un mapa de costes (flow field) usando BFS (Breadth-First Search). En lugar de calcular una ruta individual para cada zombie (costoso), genera un solo mapa de distancias desde todos los jugadores vivos. Los zombies simplemente leen este mapa y se mueven hacia la celda adyacente con el valor más bajo, un método extremadamente eficiente para cientos de unidades.
 * serverMapGenerator.js: Genera el laberinto de salas y pasillos y proporciona funciones de ayuda (getRandomOpenCellPosition) para encontrar puntos de aparición seguros lejos de los jugadores.
Lado Cliente (client/)
 * index.html: La estructura principal de la aplicación.
 * css/style.css: Todos los estilos para los menús y la interfaz.
 * js/game.js: Es el "cerebro" del cliente.
   * Maneja la lógica de la interfaz de usuario (mostrar/ocultar menús).
   * Escucha los eventos de socket.io (como gameState, gameOver, lobbyUpdate).
   * Recibe los "snapshots" de estado del servidor 30 veces por segundo.
   * Contiene el bucle de renderizado (requestAnimationFrame).
   * Interpolación: Para que el movimiento sea fluido (ya que el servidor solo envía 30 actualizaciones por segundo), el cliente interpola suavemente la posición de las entidades desde su última posición conocida (prevX) a su nueva posición objetivo (targetX).
   * Modo Espectador: Si el jugador está muerto, la cámara sigue a un compañero vivo.
 * js/entities.js: Contiene las clases del lado del cliente (Player, Zombie, Bullet, ZombieCore). Estas clases son "tontas": su única responsabilidad es dibujarse a sí mismas (draw()) en el canvas en la posición que el servidor les ha asignado.
Estructura del Proyecto
/
|-- server/
|   |-- server.js           (Gestor de Socket.io, salas, bucle principal)
|   |-- gameLogic.js        (Lógica de juego autoritativa, clases de entidades)
|   |-- serverMapGenerator.js (Generador de mapas y spawns)
|   `-- pathfinding.js        (Pathfinding BFS / Mapa de Costes)
|
|-- client/
|   |-- index.html          (Estructura HTML)
|   |-- css/
|   |   `-- style.css       (Todos los estilos)
|   `-- js/
|       |-- game.js         (Lógica de cliente, renderizado, HUD, inputs)
|       `-- entities.js     (Clases de renderizado de entidades)
|
`-- package.json

