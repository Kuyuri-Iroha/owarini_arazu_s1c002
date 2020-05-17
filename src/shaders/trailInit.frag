#version 300 es

precision highp float;

#define PI 3.14159265359

layout(location = 0) out vec3 outPosition;
layout(location = 1) out vec3 outVelocity;
layout(location = 2) out vec3 outCounter;

float random(float x) { return fract(sin(x * 12.9898) * 43758.5453); }

vec3 randomInSphere(float v) {
  float z = random(v * 0.42 + 213.23) * 2.0 - 1.0;
  float phi = random(v * 0.19 + 313.98) * PI * 2.0;
  float r = random(v * 0.35 + 192.75);

  float a = pow(r, 1.0 / 3.0);
  float b = sqrt(1.0 - z * z);

  return vec3(a * b * cos(phi), a * b * sin(phi), a * z);
}

void main(void) {
  // trailの番号をランダムシードとして与えることで同じtrailではすべての頂点位置を同じにしている
  float lr = step(0.5, random(gl_FragCoord.x * 10.0));
  outPosition = randomInSphere(gl_FragCoord.x) * vec3(0.0, 0.5, 10.0);

  outPosition.x = lr * 0.2 - 0.1;
  outPosition.x += (random(gl_FragCoord.x * 2.33) - 0.5) * 0.08;

  float theta = acos(dot(outPosition.xy, vec2(1.0, 0.0)) / (length(outPosition.xy)));
  //outPosition.xy += vec2(0.5 * cos(theta), 0.1 * sin(theta));
  
  outVelocity = outPosition;
  outCounter = vec3(0.0);
}