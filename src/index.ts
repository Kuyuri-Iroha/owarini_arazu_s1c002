import Renderer from './Renderer';
import Shader from './Shader';
import ShaderProgram from './ShaderProgram';
import { mat4, vec3, glMatrix, quat } from 'gl-matrix';
import InteractionCamera from './InteractionCamera';
import { Mesh, OBJ } from 'webgl-obj-loader';
import MRTTexture from './MRTTexture';
import CharsTexture from './CharsTexture';
import * as WebFont from 'webfontloader';

import goddessData from './models/goddess.obj';
import fighterData from './models/fighter.obj';
import particleData from './models/particle.obj';

import particleMoveVertStr from './shaders/particleMove.vert';
import transformFeedbackFragStr from './shaders/transformFeedback.frag';
import trailInitFragStr from './shaders/trailInit.frag';
import trailUpdateFragStr from './shaders/trailUpdate.frag';
import trailRenderVertStr from './shaders/trailRender.vert';
import trailRenderFragStr from './shaders/trailRender.frag';
import particleVertStr from './shaders/particle.vert';
import particleFragStr from './shaders/particle.frag';
import geometryVertStr from './shaders/geometry.vert';
import geometryFragStr from './shaders/geometry.frag';
import rectVertStr from './shaders/rect.vert';
import outputFragStr from './shaders/output.frag';
import raymarchingFragStr from './shaders/raymarching.frag';
import charVertStr from './shaders/char.vert';
import charFragStr from './shaders/char.frag';
import RenderTexture from './RenderTexture';

const init = (): void => {
  const gl = Renderer.gl;
  const sceneTexSize = Renderer.getSceneRenderSize();

  const camera = new InteractionCamera(10.0);

  // Char textures
  const charTexture = new CharsTexture('白銀のデュランダル', 512);

  // goddess
  const goddess = new Mesh(goddessData, { calcTangentsAndBitangents: true });
  const goddessBuffer = OBJ.initMeshBuffers(gl, goddess);

  // fighter
  const fighter = new Mesh(fighterData, { calcTangentsAndBitangents: true });
  const fighterBuffer = OBJ.initMeshBuffers(gl, fighter);

  // particle
  const particle = new Mesh(particleData, { calcTangentsAndBitangents: true });
  const particleBuffer = OBJ.initMeshBuffers(gl, particle);

  // G-Buffer
  const gBufTex = [
    new MRTTexture(sceneTexSize, sceneTexSize, 3, gl.FLOAT),
    new MRTTexture(sceneTexSize, sceneTexSize, 3, gl.FLOAT),
  ];
  let readBufferIdx = 0;
  let writeBufferIdx = 1;
  const swapGBuffer = (): void => {
    readBufferIdx = (readBufferIdx + 1) % 2;
    writeBufferIdx = (writeBufferIdx + 1) % 2;
  };

  // Scene render texture
  const sceneRender = new RenderTexture(
    sceneTexSize,
    sceneTexSize,
    gl.UNSIGNED_BYTE
  );
  sceneRender.texture2d.setFilter(gl.LINEAR, gl.LINEAR);

  // Particle transform feedback
  const particleMoveVert = new Shader(particleMoveVertStr, gl.VERTEX_SHADER);
  const particleMoveFrag = new Shader(
    transformFeedbackFragStr,
    gl.FRAGMENT_SHADER
  );
  const particleMoveProg = new ShaderProgram();
  gl.transformFeedbackVaryings(
    particleMoveProg.program,
    ['outPosition', 'outVelocity'],
    gl.SEPARATE_ATTRIBS
  );
  particleMoveProg.link(particleMoveVert, particleMoveFrag);
  const particleMoveTF = gl.createTransformFeedback();

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

  // Particle
  const particleVert = new Shader(particleVertStr, gl.VERTEX_SHADER);
  const particleFrag = new Shader(particleFragStr, gl.FRAGMENT_SHADER);
  const particleProg = new ShaderProgram();
  particleProg.link(particleVert, particleFrag);

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

  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clearDepth(1.0);

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
  // let scMVPMatrix = mat4.identity(mat4.create());

  // Particle VBO for transform feedback
  const particleNum = 100000;
  const particlePos = new Float32Array(particleNum * 3);
  const particleVel = new Float32Array(particleNum * 3);
  for (let vi = 0; vi < particleNum; vi += 3) {
    particlePos[vi + 0] = 0.03 * Math.random() - 0.015;
    particlePos[vi + 1] = 0.5 * Math.random() - 0.25;
    particlePos[vi + 2] = 0.03 * Math.random() - 0.015;

    particleVel[vi + 0] = 0.0;
    particleVel[vi + 1] = 0.1;
    particleVel[vi + 2] = 0.0;
  }
  let particlePosRVBO = ShaderProgram.createVBO(particlePos, gl.DYNAMIC_COPY);
  let particlePosWVBO = ShaderProgram.createVBO(
    new Float32Array(particlePos.length),
    gl.DYNAMIC_COPY
  );
  let particleVelRVBO = ShaderProgram.createVBO(particleVel, gl.DYNAMIC_COPY);
  let particleVelWVBO = ShaderProgram.createVBO(
    new Float32Array(particleVel.length),
    gl.DYNAMIC_COPY
  );
  const swapParticleVBO = (): void => {
    const tmpP = particlePosRVBO;
    const tmpV = particleVelRVBO;
    particlePosRVBO = particlePosWVBO;
    particleVelRVBO = particleVelWVBO;
    particlePosWVBO = tmpP;
    particleVelWVBO = tmpV;
  };

  // Trails
  const trailNum = 1000;
  const trailVertexNum = 100;
  let trailBufferR = new MRTTexture(
    trailNum,
    trailVertexNum,
    2,
    gl.FLOAT,
    false
  );
  let trailBufferW = new MRTTexture(
    trailNum,
    trailVertexNum,
    2,
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
  const tick = (): void => {
    requestAnimationFrame(tick);

    const time = (Date.now() - zero) * 1e-3 - 1.0;
    const currentTime = performance.now();
    const deltaTime = Math.min(0.1, (currentTime - previousTime) * 0.001);
    previousTime = currentTime;

    // camera update
    const fov = glMatrix.toRadian(60);
    camera.position = vec3.fromValues(0.0, -0.04, 0.0);
    camera.center = vec3.fromValues(0.0, 0.0, 1.0);
    // camera.update();
    mat4.lookAt(vMatrix, camera.position, camera.center, camera.up);
    mat4.perspective(pMatrix, fov, 1, 0.001, 100);
    mat4.multiply(vpMatrix, pMatrix, vMatrix);

    mat4.lookAt(
      scVMatrix,
      vec3.fromValues(0.0, 0.0, -1.0),
      vec3.create(),
      vec3.fromValues(0.0, 1.0, 0.0)
    );
    mat4.perspective(
      scPMatrix,
      60,
      Renderer.canvas.width / Renderer.canvas.height,
      0.01,
      10
    );
    mat4.multiply(scVPMatrix, scPMatrix, scVMatrix);

    // Particle transform feedback
    particleMoveProg.use();
    particleMoveProg.setAttribute(particlePosRVBO, 'position', 3, gl.FLOAT);
    particleMoveProg.setAttribute(particleVelRVBO, 'velocity', 3, gl.FLOAT);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, particleMoveTF);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, particlePosWVBO);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, particleVelWVBO);
    particleMoveProg.send1f('deltaTime', deltaTime);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, particleNum);
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.endTransformFeedback();
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
    swapParticleVBO();

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
    trailUpdateProg.send1f('time', time);
    trailUpdateProg.send1f('deltaTime', deltaTime);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    trailBufferW.unBind();
    swapTrailBuffer();

    // Rendering
    // Geometry rendering
    gBufTex[writeBufferIdx].bind();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gBufTex[writeBufferIdx].setViewport();
    // gl.viewport(0, 0, Renderer.canvas.width, Renderer.canvas.height);
    geometryProg.use();

    // goddess
    mat4.identity(mMatrix);
    let trs = mat4.create();
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 0.0, 210, 0.0),
      vec3.fromValues(0.02, -0.16, 0.2),
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

    // fighter
    mat4.identity(mMatrix);
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 20, 210, 0.0),
      vec3.fromValues(-0.02, -0.03, 0.16),
      vec3.fromValues(0.005, 0.005, 0.005)
    );
    mat4.multiply(mMatrix, mMatrix, trs);
    mat4.multiply(mvpMatrix, vpMatrix, mMatrix);

    geometryProg.sendMatrix4f('mMatrix', mMatrix);
    geometryProg.sendMatrix4f('mvpMatrix', mvpMatrix);
    geometryProg.setAttribute(
      fighterBuffer.vertexBuffer,
      'position',
      fighterBuffer.vertexBuffer.itemSize,
      gl.FLOAT
    );
    geometryProg.setAttribute(
      fighterBuffer.normalBuffer,
      'normal',
      fighterBuffer.normalBuffer.itemSize,
      gl.FLOAT
    );
    geometryProg.setAttribute(
      fighterBuffer.textureBuffer,
      'texcoord',
      fighterBuffer.textureBuffer.itemSize,
      gl.FLOAT
    );
    geometryProg.setIBO(fighterBuffer.indexBuffer);
    gl.drawElements(
      gl.TRIANGLES,
      fighterBuffer.indexBuffer.numItems,
      gl.UNSIGNED_SHORT,
      0
    );

    // particle
    mat4.identity(mMatrix);
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 0, 0, 0),
      vec3.fromValues(0.02, 0.0, 0.2),
      vec3.fromValues(0.004, 0.004, 0.004)
    );
    mat4.multiply(mMatrix, mMatrix, trs);

    particleProg.use();
    particleProg.sendMatrix4f('mMatrix', mMatrix);
    particleProg.sendMatrix4f('vpMatrix', vpMatrix);
    particleProg.setAttribute(
      particleBuffer.vertexBuffer,
      'position',
      particleBuffer.vertexBuffer.itemSize,
      gl.FLOAT
    );
    particleProg.setAttribute(
      particleBuffer.normalBuffer,
      'normal',
      particleBuffer.normalBuffer.itemSize,
      gl.FLOAT
    );
    particleProg.setAttribute(
      particleBuffer.textureBuffer,
      'texcoord',
      particleBuffer.textureBuffer.itemSize,
      gl.FLOAT
    );
    particleProg.setAttribute(particlePosRVBO, 'instancePosition', 3, gl.FLOAT);
    gl.vertexAttribDivisor(
      particleProg.getAttribLocation('instancePosition'),
      1
    );
    particleProg.setIBO(particleBuffer.indexBuffer);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      particleBuffer.indexBuffer.numItems,
      gl.UNSIGNED_SHORT,
      0,
      particleNum
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
      trailBufferR.texture2d[0],
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
    raymarchingProg.send2f('resolution', sceneTexSize, sceneTexSize);
    raymarchingProg.send1f('time', time);
    raymarchingProg.sendVector3f('cameraPosition', camera.position);
    raymarchingProg.sendVector3f('cameraCenter', camera.center);
    raymarchingProg.sendVector3f('cameraUp', camera.up);
    raymarchingProg.send1f('fov', fov);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gBufTex[writeBufferIdx].unBind();

    swapGBuffer();

    // Scene rendering
    sceneRender.bind();
    gl.viewport(0, 0, sceneTexSize, sceneTexSize);
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
    outputProg.send2f('resolution', sceneTexSize, sceneTexSize);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    sceneRender.unBind();

    // Screen rendering
    gl.viewport(0, 0, Renderer.canvas.width, Renderer.canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    charProg.use();
    charProg.setAttribute(charVertexVBO, 'position', 3, gl.FLOAT);
    charProg.setAttribute(charTexcoordVBO, 'texcoord', 2, gl.FLOAT);
    charProg.sendMatrix4f('vpMatrix', scVPMatrix);
    charProg.setIBO(charIBO);

    mat4.identity(mMatrix);
    mat4.fromRotationTranslationScale(
      trs,
      quat.fromEuler(quat.create(), 0, 0, 0),
      vec3.fromValues(0.0, 0.0, 0.0),
      vec3.fromValues(6.0, 6.0, 6.0)
    );
    mat4.multiply(mMatrix, mMatrix, trs);

    charProg.sendMatrix4f('mMatrix', mMatrix);
    charProg.sendTexture2D('charTexture', sceneRender.texture2d, 0);
    gl.drawElements(gl.TRIANGLES, charIndices.length, gl.UNSIGNED_SHORT, 0);

    // Char rendering
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    charProg.use();
    charProg.setAttribute(charVertexVBO, 'position', 3, gl.FLOAT);
    charProg.setAttribute(charTexcoordVBO, 'texcoord', 2, gl.FLOAT);
    charProg.sendMatrix4f('vpMatrix', scVPMatrix);
    charProg.setIBO(charIBO);
    for (let i = 0; i < charTexture.textures.length; i++) {
      mat4.identity(mMatrix);
      mat4.fromRotationTranslationScale(
        trs,
        quat.fromEuler(quat.create(), 0, 0, 0),
        vec3.fromValues(0.0, 2.0 * i - 8, 1.0),
        vec3.fromValues(1.0, 1.0, 1.0)
      );
      mat4.multiply(mMatrix, mMatrix, trs);

      charProg.sendMatrix4f('mMatrix', mMatrix);
      charProg.sendTexture2D('charTexture', charTexture.textures[i], 0);
      gl.drawElements(gl.TRIANGLES, charIndices.length, gl.UNSIGNED_SHORT, 0);
    }
    gl.disable(gl.BLEND);
  };

  tick();
};

const preload = (): void => {
  WebFont.load({
    google: {
      families: ['Sawarabi Mincho'],
    },
    active: init,
  });
};

window.addEventListener('load', preload);

window.addEventListener('resize', (): void => {
  Renderer.canvas.width = window.innerWidth;
  Renderer.canvas.height = window.innerHeight;
});
