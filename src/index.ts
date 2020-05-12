import Renderer from './Renderer';
import testVert from './shaders/test.vert';
import testFrag from './shaders/test.frag';
import Shader from './Shader';
import ShaderProgram from './ShaderProgram';
import { mat4, vec3, glMatrix } from 'gl-matrix';
import InteractionCamera from './InteractionCamera';
import { Mesh, OBJ } from 'webgl-obj-loader';
import oldbody from './models/oldbody.obj';

window.addEventListener('DOMContentLoaded', (): void => {
  const gl = Renderer.gl;

  const camera = new InteractionCamera(10.0);

  const testVertShader = new Shader(testVert, gl.VERTEX_SHADER);
  const testFragShader = new Shader(testFrag, gl.FRAGMENT_SHADER);

  const testProgram = new ShaderProgram();
  testProgram.link(testVertShader, testFragShader);

  // oldbody
  const oldbodyMesh = new Mesh(oldbody, { calcTangentsAndBitangents: true });
  const meshWithBuffer = OBJ.initMeshBuffers(gl, oldbodyMesh);

  let mMatrix = mat4.identity(mat4.create());
  let vMatrix = mat4.identity(mat4.create());
  let pMatrix = mat4.identity(mat4.create());
  let vpMatrix = mat4.identity(mat4.create());
  let mvpMatrix = mat4.identity(mat4.create());
  let invMatrix = mat4.identity(mat4.create());
  let normalMatrix = mat4.identity(mat4.create());

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);

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
    mat4.invert(invMatrix, mMatrix);
    mat4.transpose(normalMatrix, invMatrix);

    // Rendering
    gl.clearColor(0.0, 0.0, 0.6, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    testProgram.use();
    testProgram.sendMatrix4f('mMatrix', mMatrix);
    testProgram.sendMatrix4f('mvpMatrix', mvpMatrix);
    testProgram.sendMatrix4f('normalMatrix', normalMatrix);
    testProgram.setAttribute(
      meshWithBuffer.vertexBuffer,
      'position',
      meshWithBuffer.vertexBuffer.itemSize,
      gl.FLOAT
    );
    testProgram.setAttribute(
      meshWithBuffer.normalBuffer,
      'normal',
      meshWithBuffer.normalBuffer.itemSize,
      gl.FLOAT
    );
    testProgram.setAttribute(
      meshWithBuffer.textureBuffer,
      'texcoord',
      meshWithBuffer.textureBuffer.itemSize,
      gl.FLOAT
    );
    testProgram.setIBO(meshWithBuffer.indexBuffer);
    gl.viewport(0.0, 0.0, Renderer.canvas.width, Renderer.canvas.height);
    gl.drawElements(
      gl.TRIANGLES,
      meshWithBuffer.indexBuffer.numItems,
      gl.UNSIGNED_SHORT,
      0
    );
  };

  tick();
});

window.addEventListener('resize', (): void => {
  Renderer.canvas.width = window.innerWidth;
  Renderer.canvas.height = window.innerHeight;
});
