#version 300 es

void main() {
  gl_Position = vec4(ivec2(gl_VertexID & 1, gl_VertexID >> 1) * 2 - 1, 1.0, 1);
}