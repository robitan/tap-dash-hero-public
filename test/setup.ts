// Mock canvas and WebGL for Phaser
global.HTMLCanvasElement.prototype.getContext = () => {
  return {
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => {
      return { data: new Array(4) };
    }),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => {
      return [];
    }),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  };
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 0);
};

// Mock cancelAnimationFrame
global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Mock Audio API
class AudioMock {
  play = jest.fn();
  pause = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
}

global.Audio = AudioMock as any;

// Mock WebGL
const mockWebGL = {
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  getShaderParameter: jest.fn(() => true),
  createProgram: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  getProgramParameter: jest.fn(() => true),
  useProgram: jest.fn(),
  getAttribLocation: jest.fn(),
  getUniformLocation: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  uniform1f: jest.fn(),
  uniform2f: jest.fn(),
  uniform3f: jest.fn(),
  uniform4f: jest.fn(),
  uniform1i: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
};

HTMLCanvasElement.prototype.getContext = function(contextType: string) {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGL;
  }
  return {};
};
