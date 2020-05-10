import * as THREE from 'three';
import { Rendering } from './Rendering';

const rendering = new Rendering();
const mainCamera = new THREE.PerspectiveCamera();

window.addEventListener('DOMContentLoaded', (): void => {
  rendering.renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.appendChild(rendering.renderer.domElement);

  const scene = new THREE.Scene();

  mainCamera.fov = 45;
  mainCamera.aspect = window.innerWidth / window.innerHeight;
  mainCamera.near = 1;
  mainCamera.far = 10000;
  mainCamera.position.set(0, 0, 1000);

  const geo = new THREE.BoxBufferGeometry(250, 250, 250);
  const mat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
  const boxMesh = new THREE.Mesh(geo, mat);
  boxMesh.position.z = -5;
  scene.add(boxMesh);

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(1, 1, 1);
  scene.add(light);

  const tick = (): void => {
    requestAnimationFrame(tick);

    boxMesh.rotation.x += 0.01;
    boxMesh.rotation.y += 0.05;

    rendering.renderer.render(scene, mainCamera);
  };
  tick();

  console.log('Hello!');
});

window.addEventListener('resize', (): void => {
  rendering.renderer.setSize(window.innerWidth, window.innerHeight);
  mainCamera.aspect = window.innerWidth / window.innerHeight;
  mainCamera.updateProjectionMatrix();
});
