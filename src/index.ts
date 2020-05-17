import Renderer from './Renderer';
import Shader from './Shader';
import ShaderProgram from './ShaderProgram';
import { mat4, vec3, glMatrix, quat } from 'gl-matrix';
import InteractionCamera from './InteractionCamera';
import { Mesh, OBJ } from 'webgl-obj-loader';
import MRTTexture from './MRTTexture';
import CharsTexture from './CharsTexture';
import RenderTexture from './RenderTexture';
import * as WebFont from 'webfontloader';

import goddessData from './models/goddess.obj';

import trailInitFragStr from './shaders/trailInit.frag';
import trailUpdateFragStr from './shaders/trailUpdate.frag';
import trailRenderVertStr from './shaders/trailRender.vert';
import trailRenderFragStr from './shaders/trailRender.frag';
import geometryVertStr from './shaders/geometry.vert';
import geometryFragStr from './shaders/geometry.frag';
import rectVertStr from './shaders/rect.vert';
import outputFragStr from './shaders/output.frag';
import raymarchingFragStr from './shaders/raymarching.frag';
import screenRenderFragStr from './shaders/screenRender.frag';
import charVertStr from './shaders/char.vert';
import charFragStr from './shaders/char.frag';

const path = (z: number, scale: number): vec3 => {
  z *= 0.5;
  const v = vec3.fromValues(
    Math.sin(z + Math.cos(z * 0.7)) * 0.7,
    Math.cos(z + Math.cos(z * 1.2)) * 0.6,
    Math.cos((z + Math.cos(z * 0.9)) * 0.7) * 2.3
  );
  return vec3.scale(v, v, scale);
};

const init = (): void => {
  const gl = Renderer.gl;
  // const sceneTexSize = Renderer.getSceneRenderSize() * 2.0;
  const cinemaRatio = 0.85;
  const scWidth = Renderer.canvas.width * Math.min(window.devicePixelRatio, 2);
  const scHeight =
    Renderer.canvas.height * Math.min(window.devicePixelRatio, 2);

  const camera = new InteractionCamera(10.0);

  // Char textures
  const charTexture = new CharsTexture('終りに非ず', 512);

  // goddess
  const goddess = new Mesh(goddessData, { calcTangentsAndBitangents: true });
  const goddessBuffer = OBJ.initMeshBuffers(gl, goddess);

  // G-Buffer
  const gBufTex = [
    new MRTTexture(scWidth, scHeight, 3, gl.FLOAT),
    new MRTTexture(scWidth, scHeight, 3, gl.FLOAT),
  ];
  let readBufferIdx = 0;
  let writeBufferIdx = 1;
  const swapGBuffer = (): void => {
    readBufferIdx = (readBufferIdx + 1) % 2;
    writeBufferIdx = (writeBufferIdx + 1) % 2;
  };

  // Scene render texture
  const sceneRender = new RenderTexture(scWidth, scHeight, gl.UNSIGNED_BYTE);
  sceneRender.texture2d.setFilter(gl.LINEAR, gl.LINEAR);

  // Char
  const charVertices = [
    -1.0,
    1.0,
    0.0,
    1.0,
    1.0,
    0.0,
    -1.0,
    -1.0,
    0.0,
    1.0,
    -1.0,
    0.0,
  ];
  const charVertexVBO = ShaderProgram.createVBO(
    new Float32Array(charVertices),
    gl.STATIC_DRAW
  );
  const charTexcoord = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0];
  const charTexcoordVBO = ShaderProgram.createVBO(
    new Float32Array(charTexcoord),
    gl.STATIC_DRAW
  );
  const charIndices = [0, 1, 2, 3, 2, 1];
  const charIBO = ShaderProgram.createIBO(new Int16Array(charIndices));

  // Trail initialize
  const rectVert = new Shader(rectVertStr, gl.VERTEX_SHADER);
  const trailInitFrag = new Shader(trailInitFragStr, gl.FRAGMENT_SHADER);
  const trailInitProg = new ShaderProgram();
  trailInitProg.link(rectVert, trailInitFrag);

  // Trail update
  const trailUpdateFrag = new Shader(trailUpdateFragStr, gl.FRAGMENT_SHADER);
  const trailUpdateProg = new ShaderProgram();
  trailUpdateProg.link(rectVert, trailUpdateFrag);

  // Trail render
  const trailRenderVert = new Shader(trailRenderVertStr, gl.VERTEX_SHADER);
  const trailRenderFrag = new Shader(trailRenderFragStr, gl.FRAGMENT_SHADER);
  const trailRenderProg = new ShaderProgram();
  trailRenderProg.link(trailRenderVert, trailRenderFrag);

  // Geometry
  const geometryVert = new Shader(geometryVertStr, gl.VERTEX_SHADER);
  const geometryFrag = new Shader(geometryFragStr, gl.FRAGMENT_SHADER);
  const geometryProg = new ShaderProgram();
  geometryProg.link(geometryVert, geometryFrag);

  // Raymarching
  const raymarchingFrag = new Shader(raymarchingFragStr, gl.FRAGMENT_SHADER);
  const raymarchingProg = new ShaderProgram();
  raymarchingProg.link(rectVert, raymarchingFrag);

  // Output
  const outputFrag = new Shader(outputFragStr, gl.FRAGMENT_SHADER);
  const outputProg = new ShaderProgram();
  outputProg.link(rectVert, outputFrag);

  // char
  const charVert = new Shader(charVertStr, gl.VERTEX_SHADER);
  const charFrag = new Shader(charFragStr, gl.FRAGMENT_SHADER);
  const charProg = new ShaderProgram();
  charProg.link(charVert, charFrag);

  // Screen render
  const screenRenderFrag = new Shader(screenRenderFragStr, gl.FRAGMENT_SHADER);
  const screenRenderProg = new ShaderProgram();
  screenRenderProg.link(charVert, screenRenderFrag);

  // clear Read G-Buffer
  gBufTex[readBufferIdx].bind();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gBufTex[readBufferIdx].unBind();

  let mMatrix = mat4.identity(mat4.create());
  let vMatrix = mat4.identity(mat4.create());
  let scVMatrix = mat4.identity(mat4.create());
  let pMatrix = mat4.identity(mat4.create());
  let scPMatrix = mat4.identity(mat4.create());
  let vpMatrix = mat4.identity(mat4.create());
  let scVPMatrix = mat4.identity(mat4.create());
  let mvpMatrix = mat4.identity(mat4.create());

  // Trails
  const trailNum = 700;
  const trailVertexNum = 100;
  let trailBufferR = new MRTTexture(
    trailNum,
    trailVertexNum,
    3,
    gl.FLOAT,
    false
  );
  let trailBufferW = new MRTTexture(
    trailNum,
    trailVertexNum,
    3,
    gl.FLOAT,
    false
  );
  const swapTrailBuffer = (): void => {
    const tmp = trailBufferR;
    trailBufferR = trailBufferW;
    trailBufferW = tmp;
  };

  // Trail initialize
  trailBufferW.bind();
  trailInitProg.use();
  trailBufferW.setViewport();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  trailBufferW.unBind();
  swapTrailBuffer();

  // main loop ========================================
  const zero = Date.now();
  let previousTime = performance.now();
  let frameCount = 0;
  const tick = (): void => {
    requestAnimationFrame(tick);

    frameCount++;
    if (frameCount % 2 === 0) {
      return;
    }

    const time = (Date.now() - zero) * 1e-3 - 1.0;
    const currentTime = performance.now();
    const deltaTime = Math.min(0.1, (currentTime - previousTime) * 0.001);
    previousTime = currentTime;

    // camera update
    const fov = glMatrix.toRadian(90);
    camera.position = vec3.fromValues(0.0, -0.04, 0.0);
    camera.center = vec3.fromValues(0.0, 0.0, 1.0);
    // camera.update();
    mat4.lookAt(vMatrix, camera.position, camera.center, camera.up);
    mat4.perspective(
      pMatrix,
      fov,
      scWidth / (scHeight * cinemaRatio),
      0.001,
      100
    );
    mat4.multiply(vpMatrix, pMatrix, vMatrix);

    mat4.lookAt(
      scVMatrix,
      vec3.fromValues(0.0, 0.0, -1.0),
      vec3.create(),
      vec3.fromValues(0.0, 1.0, 0.0)
    );
    mat4.perspective(scPMatrix, 60, scWidth / scHeight, 0.01, 10);
    mat4.multiply(scVPMatrix, scPMatrix, scVMatrix);

    // Trail update
    trailBufferW.bind();
    trailUpdateProg.use();
    trailBufferW.setViewport();
    trailUpdateProg.sendTexture2D(
      'positionTexture',
      trailBufferR.texture2d[0],
      0
    );
    trailUpdateProg.sendTexture2D(
      'velocityTexture',
      trailBufferR.texture2d[1],
      1
    );
    trailUpdateProg.sendTexture2D(
      'counterTexture',
      trailBufferR.texture2d[2],
      2
    );
    trailUpdateProg.send1f('time', time);
    trailUpdateProg.send1f('deltaTime', deltaTime);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    trailBufferW.unBind();
    swapTrailBuffer();

    // Rendering
    // Geometry rendering
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clearDepth(1.0);
    gBufTex[writeBufferIdx].bind();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gBufTex[writeBufferIdx].setViewport();
    geometryProg.use();

    // goddess
    mat4.identity(mMatrix);
    let trs = mat4.create();
    const gdPos = path((time + 299.0) * 1.3, 0.01);
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 0.0, 180, 0.0),
      vec3.add(vec3.create(), gdPos, vec3.fromValues(0.0, -0.22, 0.12)),
      vec3.fromValues(0.17, 0.17, 0.17)
    );
    mat4.multiply(mMatrix, mMatrix, trs);
    mat4.multiply(mvpMatrix, vpMatrix, mMatrix);

    geometryProg.sendMatrix4f('mMatrix', mMatrix);
    geometryProg.sendMatrix4f('mvpMatrix', mvpMatrix);
    geometryProg.setAttribute(
      goddessBuffer.vertexBuffer,
      'position',
      goddessBuffer.vertexBuffer.itemSize,
      gl.FLOAT
    );
    geometryProg.setAttribute(
      goddessBuffer.normalBuffer,
      'normal',
      goddessBuffer.normalBuffer.itemSize,
      gl.FLOAT
    );
    geometryProg.setAttribute(
      goddessBuffer.textureBuffer,
      'texcoord',
      goddessBuffer.textureBuffer.itemSize,
      gl.FLOAT
    );
    geometryProg.setIBO(goddessBuffer.indexBuffer);
    gl.drawElements(
      gl.TRIANGLES,
      goddessBuffer.indexBuffer.numItems,
      gl.UNSIGNED_SHORT,
      0
    );

    // Trail rendering
    mat4.identity(mMatrix);
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 0, 0, 0),
      vec3.fromValues(0.02, 0.0, 0.2),
      vec3.fromValues(1.0, 1.0, 1.0)
    );
    mat4.multiply(mMatrix, mMatrix, trs);

    trailRenderProg.use();
    trailRenderProg.sendMatrix4f('mMatrix', mMatrix);
    trailRenderProg.sendMatrix4f('vpMatrix', vpMatrix);
    trailRenderProg.sendTexture2D(
      'positionTexture',
      trailBufferW.texture2d[0],
      0
    );
    gl.drawArraysInstanced(gl.LINE_STRIP, 0, trailVertexNum, trailNum);

    gBufTex[writeBufferIdx].unBind();

    swapGBuffer();

    gBufTex[writeBufferIdx].bind();

    // Raymarching rendering
    gl.disable(gl.DEPTH_TEST);
    raymarchingProg.use();
    raymarchingProg.sendTexture2D(
      'colorTex',
      gBufTex[readBufferIdx].texture2d[0],
      0
    );
    raymarchingProg.sendTexture2D(
      'depthTex',
      gBufTex[readBufferIdx].texture2d[1],
      1
    );
    raymarchingProg.sendTexture2D(
      'normalTex',
      gBufTex[readBufferIdx].texture2d[2],
      2
    );
    raymarchingProg.send2f(
      'resolution',
      gBufTex[writeBufferIdx].width,
      gBufTex[writeBufferIdx].height
    );
    raymarchingProg.send1f('time', time);
    raymarchingProg.sendVector3f('cameraPosition', camera.position);
    raymarchingProg.sendVector3f('cameraCenter', camera.center);
    raymarchingProg.sendVector3f('cameraUp', camera.up);
    raymarchingProg.send1f('fov', fov);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gBufTex[writeBufferIdx].unBind();

    swapGBuffer();

    // Scene rendering
    gl.clearColor(0.02, 0.02, 0.02, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    sceneRender.bind();
    gl.viewport(0, 0, scWidth, scHeight);
    outputProg.use();
    outputProg.sendTexture2D(
      'colorTex',
      gBufTex[readBufferIdx].texture2d[0],
      0
    );
    outputProg.sendTexture2D(
      'depthTex',
      gBufTex[readBufferIdx].texture2d[1],
      1
    );
    outputProg.sendTexture2D(
      'normalTex',
      gBufTex[readBufferIdx].texture2d[2],
      2
    );
    outputProg.send2f('resolution', scWidth, scHeight);
    outputProg.sendVector3f('camera', camera.position);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    sceneRender.unBind();

    // Screen rendering
    gl.viewport(0, 0, Renderer.canvas.width, Renderer.canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    screenRenderProg.use();
    screenRenderProg.setAttribute(charVertexVBO, 'position', 3, gl.FLOAT);
    screenRenderProg.setAttribute(charTexcoordVBO, 'texcoord', 2, gl.FLOAT);
    screenRenderProg.sendMatrix4f('vpMatrix', scVPMatrix);
    screenRenderProg.send2f('uResolution', scWidth, scHeight);
    screenRenderProg.setIBO(charIBO);

    mat4.identity(mMatrix);
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 0, 0, 0),
      vec3.fromValues(0.0, 0.0, 0.0),
      vec3.fromValues(6.4 * (scWidth / scHeight), 6.4 * cinemaRatio, 6.4)
    );
    mat4.multiply(mMatrix, mMatrix, trs);

    screenRenderProg.sendMatrix4f('mMatrix', mMatrix);
    screenRenderProg.sendTexture2D('screenTexture', sceneRender.texture2d, 0);
    gl.drawElements(gl.TRIANGLES, charIndices.length, gl.UNSIGNED_SHORT, 0);

    // Char rendering
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    charProg.use();
    charProg.setAttribute(charVertexVBO, 'position', 3, gl.FLOAT);
    charProg.setAttribute(charTexcoordVBO, 'texcoord', 2, gl.FLOAT);
    charProg.sendMatrix4f('vpMatrix', scVPMatrix);
    charProg.send2f(
      'uResolution',
      Renderer.gl.canvas.width,
      Renderer.gl.canvas.height
    );
    charProg.setIBO(charIBO);

    let offset = 7.4;
    const margin = 4.2;
    const scale = 1.0;

    // 終
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 0, 0, 0),
      vec3.fromValues(0.0, margin * 0 - offset, 1.0),
      vec3.fromValues(scale, scale, scale)
    );
    mat4.multiply(mMatrix, mat4.create(), trs);

    charProg.sendMatrix4f('mMatrix', mMatrix);
    charProg.sendTexture2D('charTexture', charTexture.textures[0], 0);
    gl.drawElements(gl.TRIANGLES, charIndices.length, gl.UNSIGNED_SHORT, 0);

    // り
    offset += scale;
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 0, 0, 0),
      vec3.fromValues(0.0, margin * 1 - offset, 1.0),
      vec3.fromValues(scale, scale, scale)
    );
    mat4.multiply(mMatrix, mat4.create(), trs);

    charProg.sendMatrix4f('mMatrix', mMatrix);
    charProg.sendTexture2D('charTexture', charTexture.textures[1], 0);
    gl.drawElements(gl.TRIANGLES, charIndices.length, gl.UNSIGNED_SHORT, 0);

    // に
    offset += 0.9;
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 0, 0, 0),
      vec3.fromValues(0.0, margin * 2 - offset, 1.0),
      vec3.fromValues(scale, scale, scale)
    );
    mat4.multiply(mMatrix, mat4.create(), trs);

    charProg.sendMatrix4f('mMatrix', mMatrix);
    charProg.sendTexture2D('charTexture', charTexture.textures[2], 0);
    gl.drawElements(gl.TRIANGLES, charIndices.length, gl.UNSIGNED_SHORT, 0);

    // 非
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 0, 0, 0),
      vec3.fromValues(0.0, margin * 3 - offset, 1.0),
      vec3.fromValues(scale, scale, scale)
    );
    mat4.multiply(mMatrix, mat4.create(), trs);

    charProg.sendMatrix4f('mMatrix', mMatrix);
    charProg.sendTexture2D('charTexture', charTexture.textures[3], 0);
    gl.drawElements(gl.TRIANGLES, charIndices.length, gl.UNSIGNED_SHORT, 0);

    // ず
    offset += 0.7;
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 0, 0, 0),
      vec3.fromValues(0.0, margin * 4 - offset, 1.0),
      vec3.fromValues(scale, scale, scale)
    );
    mat4.multiply(mMatrix, mat4.create(), trs);

    charProg.sendMatrix4f('mMatrix', mMatrix);
    charProg.sendTexture2D('charTexture', charTexture.textures[4], 0);
    gl.drawElements(gl.TRIANGLES, charIndices.length, gl.UNSIGNED_SHORT, 0);

    gl.disable(gl.BLEND);
  };

  tick();
};

const preload = (): void => {
  const load = (onLoad?: () => void): void => {
    WebFont.load({
      custom: {
        urls: [
          'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@500&display=swap',
        ],
        families: ['Noto Serif JP'],
        testStrings: {
          'Noto Serif JP': '終りに非ず',
        },
      },
      active: onLoad,
    });
  };

  load(init);
};

window.addEventListener('load', preload);

window.addEventListener('resize', (): void => {
  Renderer.canvas.width = window.innerWidth;
  Renderer.canvas.height = window.innerHeight;
});
