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
      rotation: 0
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
    });
    
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
    // Salto
    if (shouldJump) {
      Physics.applyJump(this.bird, this.jumpForce);
    }
    
    // Gravedad
    Physics.applyGravity(this.bird, this.gravity, deltaTime);
    Physics.clampVelocity(this.bird, this.maxVelocity);
    
    // Rotación basada en velocidad
    this.bird.rotation = Math.min(this.bird.velocity * 0.003, Math.PI / 2);
    
    // Límites del canvas - solo game over si toca el suelo
    if (this.bird.y < 0) {
      this.bird.y = 0;
      this.bird.velocity = 0;
    }
    if (this.bird.y + this.bird.height > this.canvas.height) {
      this.bird.y = this.canvas.height - this.bird.height;
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
    
    // Eliminar tubos fuera de pantalla
    this.pipes = this.pipes.filter(pipe => pipe.x + pipe.width > -100);
    
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
        this.gameOver();
        return;
      }
    }
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
    
    this.bird.x = 100;
    this.bird.y = 250;
    this.bird.velocity = 0;
    this.bird.rotation = 0;
    
    this.input.reset();
    this.input.setEnabled(true); // Habilitar input cuando empieza el juego
    
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('challengeNotification').style.display = 'none';
    this.updateScoreDisplay();
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
      this.renderer.drawBird(this.bird);
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

