/**
 * Módulo principal del juego - Lógica de juego
 */

import InputManager from './input.js';
import Renderer from './renderer.js';
import * as Physics from './physics.js';
import { checkCollision, getHighScore, setHighScore } from './utils.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);
    this.input = new InputManager();
    
    this.state = 'start'; // 'start', 'playing', 'gameover'
    this.score = 0;
    this.highScore = getHighScore();
    
    this.bird = {
      x: 100,
      y: 250,
      width: 40,
      height: 30,
      velocity: 0,
      rotation: 0,
      wingPhase: 0, // Fase de animación de alas
      isDying: false, // Estado de animación de muerte
      deathAnimationTime: 0 // Tiempo transcurrido en animación de muerte
    };
    
    this.pipes = [];
    this.pipeWidth = 60;
    this.pipeGap = 150;
    this.pipeSpeed = 150; // píxeles por segundo
    
    this.gravity = 1000;
    this.jumpForce = 250;
    this.maxVelocity = 400;
    
    // Sistema de dificultad progresiva
    this.baseGravity = 1000;
    this.baseJumpForce = 250;
    this.basePipeSpeed = 150;
    this.basePipeGap = 150;
    this.difficultyLevel = 0;
    
    this.lastTime = 0;
    this.pipeSpawnTimer = 0;
    this.pipeSpawnInterval = 1.5; // segundos
    
    // Sistema de habilidades
    this.abilities = {
      invulnerability: {
        active: false,
        duration: 3, // segundos
        cooldown: 15, // segundos
        cooldownTimer: 0,
        activeTimer: 0,
        key: this.loadAbilityKey() // Cargar tecla guardada o usar 'E' por defecto
      }
    };
    
    this.init();
  }

  /**
   * Inicializa el juego
   */
  async init() {
    await this.renderer.loadAssets({
      bird: './assets/bird.png',
      pipe: './assets/pipe.png',
      background: './assets/background.png'
    });
    
    this.setupUI();
    this.updateHighScoreDisplay();
    this.startGameLoop();
  }

  /**
   * Configura los event listeners de la UI
   */
  setupUI() {
    document.getElementById('startButton').addEventListener('click', (e) => {
      e.stopPropagation();
      this.startGame();
    });
    
    document.getElementById('restartButton').addEventListener('click', (e) => {
      e.stopPropagation();
      this.startGame();
    });
    
    // Botón de habilidad
    document.getElementById('abilityButton').addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.state === 'playing') {
        this.activateInvulnerability();
      }
    });
    
    // Permitir iniciar el juego con espacio o clic en la pantalla de inicio
    document.getElementById('startScreen').addEventListener('click', (e) => {
      if (e.target.id === 'startScreen' || e.target.id === 'startButton') {
        return; // Ya manejado por el botón
      }
      this.startGame();
    });
    
    // Permitir iniciar con espacio desde la pantalla de inicio
    window.addEventListener('keydown', (e) => {
      if ((e.code === 'Space' || e.key === ' ') && this.state === 'start') {
        e.preventDefault();
        this.startGame();
      }
      
      // Activar habilidad con la tecla configurada
      if (this.state === 'playing') {
        const abilityKey = this.abilities.invulnerability.key;
        if (e.code === abilityKey || e.key.toLowerCase() === abilityKey.toLowerCase()) {
          e.preventDefault();
          this.activateInvulnerability();
        }
      }
    });
    
    // Configuración de teclas
    this.setupKeySettings();
  }

  /**
   * Inicia el bucle principal del juego
   */
  startGameLoop() {
    const gameLoop = (currentTime) => {
      const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
      this.lastTime = currentTime;
      
      this.update(deltaTime);
      this.render();
      
      requestAnimationFrame(gameLoop);
    };
    
    requestAnimationFrame(gameLoop);
  }

  /**
   * Actualiza la lógica del juego
   * @param {number} deltaTime - Tiempo transcurrido desde el último frame
   */
  update(deltaTime) {
    if (this.state === 'playing') {
      // Verificar y consumir el salto
      const shouldJump = this.input.consumeJump();
      
      // Actualizar habilidades
      this.updateAbilities(deltaTime);
      
      // Actualizar el pájaro
      this.updateBird(deltaTime, shouldJump);
      this.updatePipes(deltaTime);
      this.checkCollisions();
      this.updateScore();
    }
  }

  /**
   * Actualiza el estado del pajarito
   * @param {number} deltaTime - Tiempo transcurrido
   * @param {boolean} shouldJump - Si debe saltar en este frame
   */
  updateBird(deltaTime, shouldJump) {
    // Si está en animación de muerte, manejar caída especial
    if (this.bird.isDying) {
      this.bird.deathAnimationTime += deltaTime;
      
      // Aplicar gravedad aumentada para caída dramática
      Physics.applyGravity(this.bird, this.gravity * 1.5, deltaTime);
      Physics.clampVelocity(this.bird, this.maxVelocity * 1.5);
      
      // Rotación extrema hacia abajo (más dramática)
      const targetRotation = Math.PI; // 180 grados (cabeza abajo)
      this.bird.rotation += (targetRotation - this.bird.rotation) * 0.15;
      
      // Detener animación de alas
      this.bird.wingPhase = 0;
      
      // Si toca el suelo o pasa suficiente tiempo, terminar animación
      if (this.bird.y + this.bird.height >= this.canvas.height || this.bird.deathAnimationTime > 2000) {
        this.bird.y = Math.min(this.bird.y, this.canvas.height - this.bird.height);
        // El gameOver ya fue llamado, solo esperar a que termine la animación
        return;
      }
      
      return;
    }
    
    // Salto
    if (shouldJump) {
      Physics.applyJump(this.bird, this.jumpForce);
      this.bird.wingPhase = 0; // Resetear fase de alas al saltar
    }
    
    // Gravedad
    Physics.applyGravity(this.bird, this.gravity, deltaTime);
    Physics.clampVelocity(this.bird, this.maxVelocity);
    
    // Rotación basada en velocidad (más suave y realista)
    const targetRotation = Math.min(this.bird.velocity * 0.002, Math.PI / 2);
    this.bird.rotation += (targetRotation - this.bird.rotation) * 0.1; // Interpolación suave
    
    // Animación de alas (más rápido cuando sube, más lento cuando baja)
    const wingSpeed = this.bird.velocity < 0 ? 15 : 8; // Más rápido subiendo
    this.bird.wingPhase += deltaTime * wingSpeed;
    if (this.bird.wingPhase > Math.PI * 2) {
      this.bird.wingPhase -= Math.PI * 2;
    }
    
    // Límites del canvas - solo game over si toca el suelo
    if (this.bird.y < 0) {
      this.bird.y = 0;
      this.bird.velocity = 0;
    }
    if (this.bird.y + this.bird.height > this.canvas.height) {
      this.bird.y = this.canvas.height - this.bird.height;
      this.startDeathAnimation();
      this.gameOver();
    }
  }

  /**
   * Actualiza los tubos
   * @param {number} deltaTime - Tiempo transcurrido
   */
  updatePipes(deltaTime) {
    // Mover tubos
    this.pipes.forEach(pipe => {
      pipe.x -= this.pipeSpeed * deltaTime;
    });
    
    // Eliminar tubos fuera de pantalla (más estricto para evitar artefactos visuales)
    this.pipes = this.pipes.filter(pipe => pipe.x + pipe.width > -50 && pipe.x < this.canvas.width + 50);
    
    // Generar nuevos tubos
    this.pipeSpawnTimer += deltaTime;
    if (this.pipeSpawnTimer >= this.pipeSpawnInterval) {
      this.spawnPipe();
      this.pipeSpawnTimer = 0;
    }
  }

  /**
   * Genera un nuevo par de tubos
   */
  spawnPipe() {
    const gapY = Math.random() * (this.canvas.height - this.pipeGap - 200) + 100;
    
    // Tubo superior
    this.pipes.push({
      x: this.canvas.width,
      y: 0,
      width: this.pipeWidth,
      height: gapY,
      passed: false
    });
    
    // Tubo inferior
    this.pipes.push({
      x: this.canvas.width,
      y: gapY + this.pipeGap,
      width: this.pipeWidth,
      height: this.canvas.height - (gapY + this.pipeGap),
      passed: false
    });
  }

  /**
   * Verifica colisiones entre el pajarito y los tubos
   */
  checkCollisions() {
    // Si la invulnerabilidad está activa, no hay colisiones
    if (this.abilities.invulnerability.active) {
      return;
    }
    
    // Si ya está muriendo, no verificar más colisiones
    if (this.bird.isDying) {
      return;
    }
    
    const birdRect = {
      x: this.bird.x,
      y: this.bird.y,
      width: this.bird.width,
      height: this.bird.height
    };
    
    for (const pipe of this.pipes) {
      const pipeRect = {
        x: pipe.x,
        y: pipe.y,
        width: pipe.width,
        height: pipe.height
      };
      
      if (checkCollision(birdRect, pipeRect)) {
        this.startDeathAnimation();
        this.gameOver();
        return;
      }
    }
  }

  /**
   * Inicia la animación de muerte del pájaro
   */
  startDeathAnimation() {
    if (this.bird.isDying) return; // Ya está muriendo
    
    this.bird.isDying = true;
    this.bird.deathAnimationTime = 0;
    // Aumentar velocidad hacia abajo para efecto dramático
    this.bird.velocity = Math.max(this.bird.velocity, 200);
  }

  /**
   * Actualiza el sistema de habilidades
   * @param {number} deltaTime - Tiempo transcurrido
   */
  updateAbilities(deltaTime) {
    const ability = this.abilities.invulnerability;
    
    // Actualizar cooldown
    if (ability.cooldownTimer > 0) {
      ability.cooldownTimer -= deltaTime;
      if (ability.cooldownTimer < 0) {
        ability.cooldownTimer = 0;
      }
    }
    
    // Actualizar duración de habilidad activa
    if (ability.active) {
      ability.activeTimer -= deltaTime;
      if (ability.activeTimer <= 0) {
        ability.active = false;
        ability.activeTimer = 0;
      }
    }
    
    // Actualizar UI
    this.updateAbilityUI();
  }

  /**
   * Activa la habilidad de invulnerabilidad
   */
  activateInvulnerability() {
    const ability = this.abilities.invulnerability;
    
    // Verificar si está en cooldown
    if (ability.cooldownTimer > 0) {
      return false;
    }
    
    // Activar habilidad
    ability.active = true;
    ability.activeTimer = ability.duration;
    ability.cooldownTimer = ability.cooldown;
    
    this.updateAbilityUI();
    return true;
  }

  /**
   * Actualiza la UI de habilidades
   */
  updateAbilityUI() {
    const ability = this.abilities.invulnerability;
    const abilityButton = document.getElementById('abilityButton');
    const abilityCooldown = document.getElementById('abilityCooldown');
    
    if (!abilityButton) {
      console.warn('abilityButton no encontrado');
      return;
    }
    
    if (!abilityCooldown) {
      console.warn('abilityCooldown no encontrado');
      return;
    }
    
    // Limpiar clases anteriores
    abilityButton.classList.remove('active', 'cooldown');
    
    if (ability.active) {
      abilityButton.classList.add('active');
      abilityButton.textContent = 'Escudo Activo';
      const remaining = Math.ceil(ability.activeTimer);
      abilityCooldown.textContent = `${remaining}s`;
      abilityCooldown.style.display = 'block';
      abilityButton.disabled = true;
    } else if (ability.cooldownTimer > 0) {
      abilityButton.classList.add('cooldown');
      abilityButton.textContent = 'En Cooldown';
      const remaining = Math.ceil(ability.cooldownTimer);
      abilityCooldown.textContent = `${remaining}s`;
      abilityCooldown.style.display = 'block';
      abilityButton.disabled = true;
    } else {
      const keyName = this.getKeyDisplayName(this.abilities.invulnerability.key);
      abilityButton.textContent = `Escudo (${keyName})`;
      abilityCooldown.style.display = 'none';
      abilityButton.disabled = false;
    }
  }

  /**
   * Carga la tecla de habilidad guardada
   * @returns {string} - Código de tecla
   */
  loadAbilityKey() {
    const saved = localStorage.getItem('abilityKey');
    return saved || 'KeyE'; // Por defecto 'E'
  }

  /**
   * Guarda la tecla de habilidad
   * @param {string} keyCode - Código de tecla
   */
  saveAbilityKey(keyCode) {
    localStorage.setItem('abilityKey', keyCode);
    this.abilities.invulnerability.key = keyCode;
    this.updateAbilityUI();
  }

  /**
   * Obtiene el nombre de visualización de una tecla
   * @param {string} keyCode - Código de tecla
   * @returns {string} - Nombre para mostrar
   */
  getKeyDisplayName(keyCode) {
    const keyMap = {
      'KeyE': 'E',
      'KeyQ': 'Q',
      'KeyR': 'R',
      'KeyF': 'F',
      'KeyS': 'S',
      'KeyD': 'D',
      'KeyW': 'W',
      'KeyA': 'A',
      'KeyZ': 'Z',
      'KeyX': 'X',
      'KeyC': 'C',
      'KeyV': 'V',
      'KeyB': 'B',
      'KeyN': 'N',
      'KeyM': 'M',
      'Digit1': '1',
      'Digit2': '2',
      'Digit3': '3',
      'Digit4': '4',
      'Digit5': '5',
      'ShiftLeft': 'SHIFT',
      'ControlLeft': 'CTRL',
      'AltLeft': 'ALT'
    };
    return keyMap[keyCode] || keyCode.replace('Key', '').replace('Digit', '');
  }

  /**
   * Obtiene la lista de teclas disponibles
   * @returns {Array} - Array de objetos {code, name}
   */
  getAvailableKeys() {
    return [
      { code: 'KeyE', name: 'E' },
      { code: 'KeyQ', name: 'Q' },
      { code: 'KeyR', name: 'R' },
      { code: 'KeyF', name: 'F' },
      { code: 'KeyS', name: 'S' },
      { code: 'KeyD', name: 'D' },
      { code: 'KeyW', name: 'W' },
      { code: 'KeyA', name: 'A' },
      { code: 'KeyZ', name: 'Z' },
      { code: 'KeyX', name: 'X' },
      { code: 'KeyC', name: 'C' },
      { code: 'KeyV', name: 'V' },
      { code: 'KeyB', name: 'B' },
      { code: 'KeyN', name: 'N' },
      { code: 'KeyM', name: 'M' },
      { code: 'Digit1', name: '1' },
      { code: 'Digit2', name: '2' },
      { code: 'Digit3', name: '3' },
      { code: 'Digit4', name: '4' },
      { code: 'Digit5', name: '5' },
      { code: 'ShiftLeft', name: 'SHIFT' },
      { code: 'ControlLeft', name: 'CTRL' },
      { code: 'AltLeft', name: 'ALT' }
    ];
  }

  /**
   * Configura el panel de configuración de teclas
   */
  setupKeySettings() {
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettings = document.getElementById('closeSettings');
    const abilityKeyInput = document.getElementById('abilityKeyInput');
    
    if (!settingsButton || !settingsPanel || !abilityKeyInput) return;
    
    // Mostrar/ocultar panel
    settingsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsPanel.classList.toggle('visible');
    });
    
    closeSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsPanel.classList.remove('visible');
    });
    
    // Configurar input de tecla
    let waitingForKey = false;
    
    abilityKeyInput.addEventListener('click', () => {
      if (waitingForKey) return;
      
      waitingForKey = true;
      abilityKeyInput.classList.add('waiting');
      abilityKeyInput.textContent = 'Presiona una tecla...';
      
      const keyHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Ignorar teclas especiales que no queremos
        if (e.code === 'Escape' || e.code === 'Tab' || e.code === 'Space') {
          waitingForKey = false;
          abilityKeyInput.classList.remove('waiting');
          abilityKeyInput.textContent = this.getKeyDisplayName(this.abilities.invulnerability.key);
          window.removeEventListener('keydown', keyHandler);
          if (e.code === 'Space') {
            alert('El espacio no está disponible para la habilidad. Usa otra tecla.');
          }
          return;
        }
        
        // Guardar la nueva tecla
        this.saveAbilityKey(e.code);
        abilityKeyInput.textContent = this.getKeyDisplayName(e.code);
        abilityKeyInput.classList.remove('waiting');
        
        waitingForKey = false;
        window.removeEventListener('keydown', keyHandler);
      };
      
      window.addEventListener('keydown', keyHandler, { once: true });
    });
    
    // Inicializar display
    abilityKeyInput.textContent = this.getKeyDisplayName(this.abilities.invulnerability.key);
    
    // Configurar modal de ayuda
    this.setupHelpModal();
  }

  /**
   * Configura el modal de ayuda con las teclas disponibles
   */
  setupHelpModal() {
    const helpButton = document.getElementById('helpButton');
    const helpModal = document.getElementById('helpModal');
    const closeHelp = document.getElementById('closeHelp');
    const keysGrid = document.getElementById('keysGrid');
    
    if (!helpButton || !helpModal || !closeHelp || !keysGrid) return;
    
    // Mostrar modal
    helpButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.updateHelpModal();
      helpModal.classList.add('visible');
    });
    
    // Cerrar modal
    closeHelp.addEventListener('click', () => {
      helpModal.classList.remove('visible');
    });
    
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        helpModal.classList.remove('visible');
      }
    });
    
    // Cerrar con Escape
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && helpModal.classList.contains('visible')) {
        helpModal.classList.remove('visible');
      }
    });
  }

  /**
   * Actualiza el contenido del modal de ayuda
   */
  updateHelpModal() {
    const keysGrid = document.getElementById('keysGrid');
    if (!keysGrid) return;
    
    keysGrid.innerHTML = '';
    const availableKeys = this.getAvailableKeys();
    const currentKey = this.abilities.invulnerability.key;
    
    availableKeys.forEach(key => {
      const keyItem = document.createElement('div');
      keyItem.className = 'key-item';
      if (key.code === currentKey) {
        keyItem.classList.add('current');
      }
      keyItem.textContent = key.name;
      keysGrid.appendChild(keyItem);
    });
  }

  /**
   * Actualiza la puntuación cuando el pajarito pasa un tubo
   */
  updateScore() {
    this.pipes.forEach(pipe => {
      if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
        pipe.passed = true;
        // Solo contar cuando pasan ambos tubos del par
        if (this.pipes.filter(p => p.passed && Math.abs(p.x - pipe.x) < 10).length === 2) {
          const oldScore = this.score;
          this.score++;
          this.updateScoreDisplay();
          
          // Verificar si se alcanzó un nuevo nivel de dificultad (cada 25 puntos)
          const newLevel = Math.floor(this.score / 25);
          if (newLevel > this.difficultyLevel) {
            this.difficultyLevel = newLevel;
            this.increaseDifficulty();
          }
        }
      }
    });
  }

  /**
   * Aumenta la dificultad del juego
   */
  increaseDifficulty() {
    // Aumentar velocidad de los tubos
    this.pipeSpeed = this.basePipeSpeed + (this.difficultyLevel * 30);
    
    // Reducir el espacio entre tubos
    this.pipeGap = Math.max(100, this.basePipeGap - (this.difficultyLevel * 10));
    
    // Aumentar gravedad ligeramente
    this.gravity = this.baseGravity + (this.difficultyLevel * 50);
    
    // Reducir intervalo de generación de tubos
    this.pipeSpawnInterval = Math.max(0.8, 1.5 - (this.difficultyLevel * 0.1));
    
    // Mostrar notificación
    this.showChallengeNotification();
  }

  /**
   * Muestra una notificación de desafío
   */
  showChallengeNotification() {
    const messages = [
      '¡Velocidad aumentada!',
      '¡Dificultad extrema!',
      '¡Modo infernal activado!',
      '¡Velocidad máxima!',
      '¡Desafío épico!'
    ];
    
    const messageIndex = Math.min(this.difficultyLevel - 1, messages.length - 1);
    const message = messages[messageIndex] || `Nivel ${this.difficultyLevel} alcanzado!`;
    
    const notification = document.getElementById('challengeNotification');
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Ocultar después de 2 segundos
    setTimeout(() => {
      notification.style.display = 'none';
    }, 2000);
  }

  /**
   * Inicia una nueva partida
   */
  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.pipes = [];
    this.pipeSpawnTimer = 0;
    
    // Resetear dificultad
    this.difficultyLevel = 0;
    this.gravity = this.baseGravity;
    this.jumpForce = this.baseJumpForce;
    this.pipeSpeed = this.basePipeSpeed;
    this.pipeGap = this.basePipeGap;
    this.pipeSpawnInterval = 1.5;
    
    // Resetear habilidades
    this.abilities.invulnerability.active = false;
    this.abilities.invulnerability.activeTimer = 0;
    this.abilities.invulnerability.cooldownTimer = 0;
    
    this.bird.x = 100;
    this.bird.y = 250;
    this.bird.velocity = 0;
    this.bird.rotation = 0;
    this.bird.wingPhase = 0;
    this.bird.isDying = false;
    this.bird.deathAnimationTime = 0;
    
    this.input.reset();
    this.input.setEnabled(true); // Habilitar input cuando empieza el juego
    
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('challengeNotification').style.display = 'none';
    
    // Mostrar contenedor de habilidades
    const abilityContainer = document.getElementById('abilityContainer');
    if (abilityContainer) {
      abilityContainer.style.display = 'flex';
    }
    
    this.updateScoreDisplay();
    
    // Inicializar UI de habilidades
    this.updateAbilityUI();
  }

  /**
   * Termina el juego
   */
  gameOver() {
    if (this.state === 'gameover') return; // Evitar múltiples game over
    
    this.state = 'gameover';
    this.input.setEnabled(false); // Deshabilitar input cuando termina el juego
    
    // Actualizar récord
    if (this.score > this.highScore) {
      this.highScore = this.score;
      setHighScore(this.highScore);
      this.updateHighScoreDisplay();
    }
    
    document.getElementById('finalScore').textContent = `Puntuación: ${this.score}`;
    document.getElementById('gameOverScreen').style.display = 'flex';
  }

  /**
   * Renderiza el juego
   */
  render() {
    this.renderer.clear();
    this.renderer.drawBackground();
    
    if (this.state === 'playing' || this.state === 'gameover') {
      this.renderer.drawPipes(this.pipes);
      this.renderer.drawBird(this.bird, this.abilities.invulnerability.active);
    }
  }

  /**
   * Actualiza el display de puntuación
   */
  updateScoreDisplay() {
    document.getElementById('score').textContent = this.score;
  }

  /**
   * Actualiza el display de récord
   */
  updateHighScoreDisplay() {
    document.getElementById('highScore').textContent = `Récord: ${this.highScore}`;
  }
}

// Registrar Service Worker cuando la página carga
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('Service Worker registrado:', registration);
      })
      .catch((error) => {
        console.error('Error registrando Service Worker:', error);
      });
  });
}

// Inicializar el juego cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  new Game();
});

