import Renderer from './Renderer';
import Shader from './Shader';
import ShaderProgram from './ShaderProgram';
import { mat4, vec3, glMatrix } from 'gl-matrix';
import InteractionCamera from './InteractionCamera';
import { Mesh, OBJ } from 'webgl-obj-loader';
import MRTTexture from './MRTTexture';

import oldbody from './models/oldbody.obj';

import geometryVertStr from './shaders/geometry.vert';
import geometryFragStr from './shaders/geometry.frag';
import rectVertStr from './shaders/rect.vert';
import outputFragStr from './shaders/output.frag';
import raymarchingFragStr from './shaders/raymarching.frag';

window.addEventListener('DOMContentLoaded', (): void => {
  const gl = Renderer.gl;

  const camera = new InteractionCamera(10.0);

  // oldbody
  const oldbodyMesh = new Mesh(oldbody, { calcTangentsAndBitangents: true });
  const meshWithBuffer = OBJ.initMeshBuffers(gl, oldbodyMesh);

  // G-Buffer
  const gBufTex = [
    new MRTTexture(Renderer.canvas.width, Renderer.canvas.height, 3, gl.FLOAT),
    new MRTTexture(Renderer.canvas.width, Renderer.canvas.height, 3, gl.FLOAT),
  ];
  for (let gi = 0; gi < gBufTex.length; gi++) {
    for (let gj = 0; gj < gBufTex[gi].texture2d.length; gj++) {
      gBufTex[gi].texture2d[gj].setFilter(gl.NEAREST, gl.NEAREST);
    }
  }
  let readBufferIdx = 0;
  let writeBufferIdx = 1;
  const swapGBuffer = (): void => {
    readBufferIdx = (readBufferIdx + 1) % 2;
    writeBufferIdx = (writeBufferIdx + 1) % 2;
  };

  // Geometry
  const geometryVert = new Shader(geometryVertStr, gl.VERTEX_SHADER);
  const geometryFrag = new Shader(geometryFragStr, gl.FRAGMENT_SHADER);
  const geometryProg = new ShaderProgram();
  geometryProg.link(geometryVert, geometryFrag);

  // Raymarching
  const rectVert = new Shader(rectVertStr, gl.VERTEX_SHADER);
  const raymarchingFrag = new Shader(raymarchingFragStr, gl.FRAGMENT_SHADER);
  const raymarchingProg = new ShaderProgram();
  raymarchingProg.link(rectVert, raymarchingFrag);

  // Output
  const outputFrag = new Shader(outputFragStr, gl.FRAGMENT_SHADER);
  const outputProg = new ShaderProgram();
  outputProg.link(rectVert, outputFrag);

  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clearDepth(1.0);

  // clear Read G-Buffer
  gBufTex[readBufferIdx].bind();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gBufTex[readBufferIdx].unBind();

  let mMatrix = mat4.identity(mat4.create());
  let vMatrix = mat4.identity(mat4.create());
  let pMatrix = mat4.identity(mat4.create());
  let vpMatrix = mat4.identity(mat4.create());
  let mvpMatrix = mat4.identity(mat4.create());

  // main loop
  const zero = Date.now();
  // let frameCount = 0;
  const tick = (): void => {
    requestAnimationFrame(tick);

    const time = (Date.now() - zero) * 1e-3 - 1.0;

    // camera update
    camera.update();
    mat4.lookAt(vMatrix, camera.position, camera.center, camera.up);
    mat4.perspective(
      pMatrix,
      glMatrix.toRadian(90),
      Renderer.canvas.width / Renderer.canvas.height,
      0.001,
      100
    );
    mat4.multiply(vpMatrix, pMatrix, vMatrix);

    // sphere update
    const axis = vec3.fromValues(0.0, 1.0, 0.0);
    const radian = time % (Math.PI * 2.0);
    mat4.identity(mMatrix);
    mat4.rotate(mMatrix, mMatrix, radian, axis);
    mat4.translate(mMatrix, mMatrix, vec3.fromValues(0.0, -0.8, 0.0));
    mat4.multiply(mvpMatrix, vpMatrix, mMatrix);

    // Rendering
    // Geometry rendering
    gBufTex[writeBufferIdx].bind();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gBufTex[writeBufferIdx].setViewport();
    geometryProg.use();
    geometryProg.sendMatrix4f('mMatrix', mMatrix);
    geometryProg.sendMatrix4f('mvpMatrix', mvpMatrix);
    geometryProg.setAttribute(
      meshWithBuffer.vertexBuffer,
      'position',
      meshWithBuffer.vertexBuffer.itemSize,
      gl.FLOAT
    );
    geometryProg.setAttribute(
      meshWithBuffer.normalBuffer,
      'normal',
      meshWithBuffer.normalBuffer.itemSize,
      gl.FLOAT
    );
    geometryProg.setAttribute(
      meshWithBuffer.textureBuffer,
      'texcoord',
      meshWithBuffer.textureBuffer.itemSize,
      gl.FLOAT
    );
    geometryProg.setIBO(meshWithBuffer.indexBuffer);
    gl.drawElements(
      gl.TRIANGLES,
      meshWithBuffer.indexBuffer.numItems,
      gl.UNSIGNED_SHORT,
      0
    );
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
      Renderer.canvas.width,
      Renderer.canvas.height
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gBufTex[writeBufferIdx].unBind();

    swapGBuffer();

    // Screen rendering
    // if (frameCount !== 0) {
    gl.viewport(0.0, 0.0, Renderer.canvas.width, Renderer.canvas.height);
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
    outputProg.send2f(
      'resolution',
      Renderer.canvas.width,
      Renderer.canvas.height
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // }

    // readBufferIdx = (readBufferIdx + 1) % 2;
    // writeBufferIdx = (writeBufferIdx + 1) % 2;

    // frameCount++;
  };

  tick();
});

window.addEventListener('resize', (): void => {
  Renderer.canvas.width = window.innerWidth;
  Renderer.canvas.height = window.innerHeight;
});
