#version 300 es
precision highp float;

uniform sampler2D colorTex;
uniform sampler2D depthTex;
uniform sampler2D normalTex;
uniform vec2 resolution;

layout (location = 0) out vec4 outColor;

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / resolution;
  vec2 uv = p * 0.5 + 0.5;
  outColor = vec4(texture(colorTex, uv).rgb, 1.0);
}
