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
import outputVertStr from './shaders/output.vert';
import outputFragStr from './shaders/output.frag';

window.addEventListener('DOMContentLoaded', (): void => {
  const gl = Renderer.gl;

  const camera = new InteractionCamera(10.0);

  // oldbody
  const oldbodyMesh = new Mesh(oldbody, { calcTangentsAndBitangents: true });
  const meshWithBuffer = OBJ.initMeshBuffers(gl, oldbodyMesh);

  // G-Buffer
  const geometryVert = new Shader(geometryVertStr, gl.VERTEX_SHADER);
  const geometryFrag = new Shader(geometryFragStr, gl.FRAGMENT_SHADER);
  const geometryProg = new ShaderProgram();
  geometryProg.link(geometryVert, geometryFrag);
  const gBufTex = new MRTTexture(
    Renderer.canvas.width,
    Renderer.canvas.height,
    3,
    gl.FLOAT
  );
  for (let gi = 0; gi < gBufTex.texture2d.length; gi++) {
    gBufTex.texture2d[gi].setFilter(gl.NEAREST, gl.NEAREST);
  }

  // Output
  const outputVert = new Shader(outputVertStr, gl.VERTEX_SHADER);
  const outputFrag = new Shader(outputFragStr, gl.FRAGMENT_SHADER);
  const outputProg = new ShaderProgram();
  outputProg.link(outputVert, outputFrag);

  gl.clearColor(0.0, 0.0, 0.6, 1.0);
  gl.clearDepth(1.0);

  let mMatrix = mat4.identity(mat4.create());
  let vMatrix = mat4.identity(mat4.create());
  let pMatrix = mat4.identity(mat4.create());
  let vpMatrix = mat4.identity(mat4.create());
  let mvpMatrix = mat4.identity(mat4.create());

  // main loop
  const zero = Date.now();
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
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // Geometry rendering
    gBufTex.bind();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gBufTex.setViewport();
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
    gBufTex.unBind();

    // Screen rendering
    gl.disable(gl.DEPTH_TEST);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.viewport(0.0, 0.0, Renderer.canvas.width, Renderer.canvas.height);
    outputProg.use();
    outputProg.sendTexture2D('colorTex', gBufTex.texture2d[0], 0);
    outputProg.sendTexture2D('depthTex', gBufTex.texture2d[1], 1);
    outputProg.sendTexture2D('normalTex', gBufTex.texture2d[2], 2);
    outputProg.send2f(
      'resolution',
      Renderer.canvas.width,
      Renderer.canvas.height
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  tick();
});

window.addEventListener('resize', (): void => {
  Renderer.canvas.width = window.innerWidth;
  Renderer.canvas.height = window.innerHeight;
});
