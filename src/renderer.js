/**
 * Módulo de renderizado en Canvas
 */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = {};
    
    // Viewport virtual para la lógica del juego (aspect ratio 2:3)
    this.viewport = {
      width: 400,
      height: 600
    };
    
    this.setupCanvas();
    this.setupResizeListener();
  }
  
  /**
   * Obtiene el ancho del viewport virtual (para la lógica del juego)
   */
  get width() {
    return this.viewport.width;
  }
  
  /**
   * Obtiene el alto del viewport virtual (para la lógica del juego)
   */
  get height() {
    return this.viewport.height;
  }

  /**
   * Configura el canvas con el tamaño adecuado (responsive)
   */
  setupCanvas() {
    // Obtener tamaño real de la pantalla (con devicePixelRatio para alta resolución)
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    
    // Tamaño del viewport virtual (lógica del juego)
    const viewportWidth = this.viewport.width;
    const viewportHeight = this.viewport.height;
    const viewportAspect = viewportWidth / viewportHeight;
    const screenAspect = displayWidth / displayHeight;
    
    // Calcular escalado para mantener aspect ratio (contain mode)
    const scaleX = displayWidth / viewportWidth;
    const scaleY = displayHeight / viewportHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Calcular dimensiones del canvas real (con DPR para alta resolución)
    const canvasWidth = displayWidth * dpr;
    const canvasHeight = displayHeight * dpr;
    
    // Establecer tamaño real del canvas (en píxeles)
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    
    // Establecer tamaño visual del canvas (en CSS pixels)
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    this.canvas.style.display = 'block';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.margin = '0';
    this.canvas.style.transform = 'none';
    
    // Escalar el contexto para que el viewport virtual se ajuste al canvas real
    this.setupCanvasTransform(scale, displayWidth, displayHeight, viewportWidth, viewportHeight);
  }

  /**
   * Configura el listener para redimensionar la ventana
   */
  setupResizeListener() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.setupCanvas();
      }, 100);
    });
  }

  /**
   * Carga los assets del juego
   * @param {Object} assetPaths - Objeto con rutas de assets {bird, pipe, background}
   * @returns {Promise} - Promesa que resuelve cuando todos los assets están cargados
   */
  async loadAssets(assetPaths) {
    try {
      // Si no hay imágenes, usar formas geométricas
      this.assets.bird = await this.createBirdShape();
      this.assets.pipe = await this.createPipeShape();
      this.assets.background = null; // Fondo se dibuja con gradiente
    } catch (error) {
      console.error('Error cargando assets:', error);
      // Fallback a formas geométricas
      this.assets.bird = await this.createBirdShape();
      this.assets.pipe = await this.createPipeShape();
    }
  }

  /**
   * Crea una forma de pajarito (fallback si no hay imagen)
   * @returns {Promise<Image>} - Imagen del pajarito
   */
  async createBirdShape() {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');

    // Cuerpo del pajarito (círculo)
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(20, 15, 12, 0, Math.PI * 2);
    ctx.fill();

    // Ojo
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(25, 12, 3, 0, Math.PI * 2);
    ctx.fill();

    // Pico
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(32, 15);
    ctx.lineTo(40, 12);
    ctx.lineTo(40, 18);
    ctx.closePath();
    ctx.fill();

    // Alas (se animarán en drawBird)
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.ellipse(15, 20, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = canvas.toDataURL();
    });
  }

  /**
   * Crea una forma de tubo (fallback si no hay imagen)
   * @returns {Promise<Image>} - Imagen del tubo
   */
  async createPipeShape() {
    const canvas = document.createElement('canvas');
    canvas.width = 60;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    // Tubo verde
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, 0, 60, 400);

    // Borde
    ctx.strokeStyle = '#006400';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 60, 400);

    // Detalles solo en los extremos (parte superior e inferior)
    ctx.fillStyle = '#32CD32';
    ctx.fillRect(5, 5, 50, 20); // Parte superior
    ctx.fillRect(5, 380, 50, 15); // Parte inferior (ajustado para que no aparezca en el medio)

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = canvas.toDataURL();
    });
  }

  /**
   * Limpia el canvas
   */
  clear() {
    // Resetear transformaciones antes de limpiar
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Limpiar toda el área del canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Restaurar el escalado después de limpiar
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    const viewportWidth = this.viewport.width;
    const viewportHeight = this.viewport.height;
    const scaleX = displayWidth / viewportWidth;
    const scaleY = displayHeight / viewportHeight;
    const scale = Math.min(scaleX, scaleY);
    this.setupCanvasTransform(scale, displayWidth, displayHeight, viewportWidth, viewportHeight);
  }

  /**
   * Configura la transformación del canvas (escalado responsive)
   * @param {number} scale - Escala calculada
   * @param {number} displayWidth - Ancho de la pantalla
   * @param {number} displayHeight - Alto de la pantalla
   * @param {number} viewportWidth - Ancho del viewport virtual
   * @param {number} viewportHeight - Alto del viewport virtual
   */
  setupCanvasTransform(scale, displayWidth, displayHeight, viewportWidth, viewportHeight) {
    const dpr = window.devicePixelRatio || 1;
    
    // Calcular dimensiones escaladas del viewport
    const scaledWidth = viewportWidth * scale;
    const scaledHeight = viewportHeight * scale;
    
    // Calcular offset para centrar el viewport en el canvas
    const offsetX = (displayWidth - scaledWidth) / 2;
    const offsetY = (displayHeight - scaledHeight) / 2;
    
    // Resetear transformación
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Escalar por DPR primero
    this.ctx.scale(dpr, dpr);
    
    // Aplicar offset y escalado del viewport
    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(scale, scale);
  }

  /**
   * Dibuja el fondo
   */
  drawBackground() {
    // Gradiente de cielo (usar viewport virtual)
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.viewport.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#98D8E8');
    gradient.addColorStop(1, '#B0E0E6');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);

    // Nubes simples
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.drawCloud(80, 100);
    this.drawCloud(250, 150);
    this.drawCloud(150, 250);
  }

  /**
   * Dibuja una nube simple
   * @param {number} x - Posición X
   * @param {number} y - Posición Y
   */
  drawCloud(x, y) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, 20, 0, Math.PI * 2);
    this.ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
    this.ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Dibuja el pajarito
   * @param {Object} bird - Objeto pajarito {x, y, width, height, rotation, isDying, deathAnimationTime}
   * @param {boolean} invulnerable - Si el pájaro está invulnerable
   */
  drawBird(bird, invulnerable = false) {
    this.ctx.save();
    
    this.ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    this.ctx.rotate(bird.rotation || 0);
    
    // Efectos visuales de muerte
    if (bird.isDying) {
      // Parpadeo rojo durante la caída
      const blinkSpeed = 100; // ms
      const blinkPhase = (bird.deathAnimationTime % (blinkSpeed * 2)) / blinkSpeed;
      if (blinkPhase < 1) {
        // Efecto de "golpe" - tinte rojo
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(-bird.width / 2 - 5, -bird.height / 2 - 5, bird.width + 10, bird.height + 10);
        this.ctx.globalAlpha = 1;
      }
      
      // Partículas de "choque" (círculos pequeños alrededor)
      if (bird.deathAnimationTime < 300) {
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount;
          const distance = 15 + (bird.deathAnimationTime / 300) * 10;
          const x = Math.cos(angle) * distance;
          const y = Math.sin(angle) * distance;
          
          this.ctx.fillStyle = `rgba(255, 100, 0, ${1 - bird.deathAnimationTime / 300})`;
          this.ctx.beginPath();
          this.ctx.arc(x, y, 3, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
    
    // Escudo dorado cuando está invulnerable (dibujar primero para que esté detrás)
    if (invulnerable && !bird.isDying) {
      // Círculo exterior brillante
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, bird.width / 2 + 15);
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
      gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, bird.width / 2 + 15, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Borde dorado brillante
      this.ctx.strokeStyle = '#FFD700';
      this.ctx.lineWidth = 4;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#FFD700';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, bird.width / 2 + 10, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // Segundo círculo interno
      this.ctx.strokeStyle = '#FFA500';
      this.ctx.lineWidth = 2;
      this.ctx.shadowBlur = 5;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, bird.width / 2 + 5, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // Resetear sombra
      this.ctx.shadowBlur = 0;
    }
    
    // Dibujar el pájaro con animación de alas (o sin alas si está muriendo)
    this.drawAnimatedBird(bird);
    
    this.ctx.restore();
  }

  /**
   * Dibuja el pájaro con animación de alas
   * @param {Object} bird - Objeto pajarito con wingPhase, isDying
   */
  drawAnimatedBird(bird) {
    const ctx = this.ctx;
    
    // Si está muriendo, usar colores más apagados
    const bodyColor = bird.isDying ? '#CCAA00' : '#FFD700';
    const beakColor = bird.isDying ? '#CC6600' : '#FF8C00';
    const wingColor = bird.isDying ? '#CC8800' : '#FFA500';
    const wingColor2 = bird.isDying ? '#AA6600' : '#FF8C00';
    
    // Cuerpo del pajarito (círculo)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Ojo (cerrado si está muriendo)
    if (!bird.isDying) {
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(5, -3, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Ojo cerrado (línea)
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, -3);
      ctx.lineTo(8, -3);
      ctx.stroke();
    }
    
    // Pico
    ctx.fillStyle = beakColor;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, -3);
    ctx.lineTo(20, 3);
    ctx.closePath();
    ctx.fill();
    
    // Animación de alas basada en wingPhase (solo si no está muriendo)
    if (!bird.isDying && bird.wingPhase !== undefined) {
      const wingAngle = Math.sin(bird.wingPhase || 0) * 0.5; // Movimiento de -0.5 a 0.5 radianes
      
      // Ala izquierda (principal)
      ctx.save();
      ctx.translate(-5, 5);
      ctx.rotate(-0.3 + wingAngle);
      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // Ala derecha (más pequeña, efecto de profundidad)
      ctx.save();
      ctx.translate(-3, 6);
      ctx.rotate(-0.2 + wingAngle * 0.7);
      ctx.fillStyle = wingColor2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    } else if (bird.isDying) {
      // Alas caídas cuando está muriendo
      ctx.save();
      ctx.translate(-5, 5);
      ctx.rotate(0.5); // Ala caída
      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      ctx.save();
      ctx.translate(-3, 6);
      ctx.rotate(0.4);
      ctx.fillStyle = wingColor2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Dibuja un tubo
   * @param {Object} pipe - Objeto tubo {x, y, width, height}
   */
  drawPipe(pipe) {
    // Solo dibujar si el tubo está dentro o cerca del área visible
    // Evitar dibujar tubos que están muy fuera de pantalla
    if (pipe.x + pipe.width < -50 || pipe.x > this.viewport.width + 50) {
      return;
    }
    
    // Dibujar el tubo directamente con formas simples
    const ctx = this.ctx;
    
    // Guardar el estado del contexto
    ctx.save();
    
    // Tubo verde principal
    ctx.fillStyle = '#228B22';
    ctx.fillRect(pipe.x, pipe.y, pipe.width, pipe.height);
    
    // Borde oscuro más grueso para darle textura
    ctx.strokeStyle = '#006400';
    ctx.lineWidth = 4;
    ctx.strokeRect(pipe.x, pipe.y, pipe.width, pipe.height);
    
    // Borde interno más claro para dar profundidad
    ctx.strokeStyle = '#32CD32';
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x + 2, pipe.y + 2, pipe.width - 4, pipe.height - 4);
    
    // Restaurar el estado del contexto
    ctx.restore();
  }

  /**
   * Dibuja todos los tubos
   * @param {Array} pipes - Array de objetos tubo
   */
  drawPipes(pipes) {
    pipes.forEach(pipe => {
      this.drawPipe(pipe);
    });
  }
}

export default Renderer;

