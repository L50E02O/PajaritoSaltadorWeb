/**
 * Módulo de renderizado en Canvas
 */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = {};
    this.setupCanvas();
    this.setupResizeListener();
  }

  /**
   * Configura el canvas con el tamaño adecuado
   */
  setupCanvas() {
    // Usar el tamaño completo de la ventana
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Tamaño base del juego (aspect ratio 2:3)
    const baseWidth = 400;
    const baseHeight = 600;
    const aspectRatio = baseWidth / baseHeight;

    // Calcular escala para mostrar todo el contenido (contain mode)
    // Usar la escala menor para que todo se vea sin recortes
    const scaleX = width / baseWidth;
    const scaleY = height / baseHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calcular dimensiones finales del canvas
    const canvasWidth = baseWidth * scale;
    const canvasHeight = baseHeight * scale;

    // Resetear el contexto
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // El canvas interno mantiene el tamaño base para la lógica del juego
    this.canvas.width = baseWidth;
    this.canvas.height = baseHeight;
    
    // El canvas visual se ajusta al tamaño calculado y se centra
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;
    this.canvas.style.display = 'block';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '50%';
    this.canvas.style.left = '50%';
    this.canvas.style.margin = '0';
    this.canvas.style.transform = 'translate(-50%, -50%)';
    
    // Escalar el contexto para que el contenido se ajuste
    this.setupCanvasTransform();
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

    // Alas
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
    // Resetear transformaciones antes de limpiar para asegurar que se limpie todo
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Restaurar el escalado después de limpiar
    this.setupCanvasTransform();
  }

  /**
   * Configura la transformación del canvas (escalado)
   */
  setupCanvasTransform() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const baseWidth = 400;
    const baseHeight = 600;
    
    const scaleX = width / baseWidth;
    const scaleY = height / baseHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Aplicar el escalado
    this.ctx.scale(scale, scale);
  }

  /**
   * Dibuja el fondo
   */
  drawBackground() {
    // Gradiente de cielo
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#98D8E8');
    gradient.addColorStop(1, '#B0E0E6');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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
   * @param {Object} bird - Objeto pajarito {x, y, width, height, rotation}
   */
  drawBird(bird) {
    this.ctx.save();
    this.ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    this.ctx.rotate(bird.rotation || 0);
    this.ctx.drawImage(
      this.assets.bird,
      -bird.width / 2,
      -bird.height / 2,
      bird.width,
      bird.height
    );
    this.ctx.restore();
  }

  /**
   * Dibuja un tubo
   * @param {Object} pipe - Objeto tubo {x, y, width, height}
   */
  drawPipe(pipe) {
    // Solo dibujar si el tubo está dentro o cerca del área visible
    // Evitar dibujar tubos que están muy fuera de pantalla
    if (pipe.x + pipe.width < -50 || pipe.x > this.canvas.width + 50) {
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

