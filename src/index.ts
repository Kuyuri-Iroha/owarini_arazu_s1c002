import Renderer from './Renderer';
import testVert from './shaders/test.vert';
import testFrag from './shaders/test.frag';
import Shader from './Shader';
import ShaderProgram from './ShaderProgram';
import Utils from './Utils';
import { mat4, vec3 } from 'gl-matrix';
import InteractionCamera from './InteractionCamera';

window.addEventListener('DOMContentLoaded', (): void => {
  const gl = Renderer.gl;

  const camera = new InteractionCamera(5.0);

  const testVertShader = new Shader(testVert, gl.VERTEX_SHADER);
  const testFragShader = new Shader(testFrag, gl.FRAGMENT_SHADER);

  const testProgram = new ShaderProgram();
  testProgram.link(testVertShader, testFragShader);

  const sphereData = Utils.createSphereGeometry(16, 16, 0.2);
  const vboPos = ShaderProgram.createVBO(
    Utils.getFloat32ArrayFromVec3Array(sphereData.pos)
  );
  const vboNorm = ShaderProgram.createVBO(
    Utils.getFloat32ArrayFromVec3Array(sphereData.norm)
  );
  const vboCol = ShaderProgram.createVBO(
    Utils.getFloat32ArrayFromVec4Array(sphereData.col)
  );
  const ibo = ShaderProgram.createIBO(
    Utils.getInt16ArrayFromVec3Array(sphereData.idx)
  );

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
      90,
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
    mat4.rotate(mMatrix, mMatrix, radian, [axis[1], axis[0], axis[2]]);
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
    testProgram.setAttribute(vboPos, 'position', 3, gl.FLOAT);
    testProgram.setAttribute(vboNorm, 'normal', 3, gl.FLOAT);
    testProgram.setAttribute(vboCol, 'color', 4, gl.FLOAT);
    testProgram.setIBO(ibo);
    gl.viewport(0.0, 0.0, Renderer.canvas.width, Renderer.canvas.height);
    gl.drawElements(
      gl.TRIANGLES,
      sphereData.idx.length * 3,
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
