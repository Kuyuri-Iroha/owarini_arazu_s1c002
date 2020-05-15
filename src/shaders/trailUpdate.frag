#version 300 es
precision highp float;

layout (location = 0) out vec3 outPosition;
layout (location = 1) out vec3 outVelocity;

uniform sampler2D positionTexture;
uniform sampler2D velocityTexture;
uniform float time;
uniform float deltaTime;

float random(vec4 x){
  return fract(sin(dot(x,vec4(12.9898, 78.233, 39.425, 27.196))) * 43758.5453);
}
float valuenoise(vec4 x) {
  vec4 i = floor(x);
  vec4 f = fract(x);
  vec4 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(
          mix(random(i + vec4(0.0, 0.0, 0.0, 0.0)), random(i + vec4(1.0, 0.0, 0.0, 0.0)), u.x),
          mix(random(i + vec4(0.0, 1.0, 0.0, 0.0)), random(i + vec4(1.0, 1.0, 0.0, 0.0)), u.x),
          u.y
      ),
      mix(
          mix(random(i + vec4(0.0, 0.0, 1.0, 0.0)), random(i + vec4(1.0, 0.0, 1.0, 0.0)), u.x),
          mix(random(i + vec4(0.0, 1.0, 1.0, 0.0)), random(i + vec4(1.0, 1.0, 1.0, 0.0)), u.x),
          u.y
      ),
      u.z
    ),
    mix(
      mix(
          mix(random(i + vec4(0.0, 0.0, 0.0, 1.0)), random(i + vec4(1.0, 0.0, 0.0, 1.0)), u.x),
          mix(random(i + vec4(0.0, 1.0, 0.0, 1.0)), random(i + vec4(1.0, 1.0, 0.0, 1.0)), u.x),
          u.y
      ),
      mix(
          mix(random(i + vec4(0.0, 0.0, 1.0, 1.0)), random(i + vec4(1.0, 0.0, 1.0, 1.0)), u.x),
          mix(random(i + vec4(0.0, 1.0, 1.0, 1.0)), random(i + vec4(1.0, 1.0, 1.0, 1.0)), u.x),
          u.y
      ),
      u.z
    ),
    u.w
  );
}
float fbm(vec4 x) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * valuenoise(x);
    amp *= 0.5;
    x *= 2.01;
  }
  return sum * 2.0 - 1.0;
}
float noiseX(vec4 x) {
  return fbm(x * 0.34 + vec4(4324.32, 7553.13, 5417.33, 1484.43));
}
float noiseY(vec4 x) {
  return fbm(x * 0.71 + vec4(1614.43, 8439.32, 4211.93, 8546.29));
}
float noiseZ(vec4 x) {
  return fbm(x * 0.54 + vec4(4342.34, 7569.34, 3812.42, 1589.54));
}
vec3 curlnoise(vec3 x, float time) {
  float e = 0.01;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);
  return vec3(
    (noiseZ(vec4(x + dy, time)) - noiseZ(vec4(x - dy, time))) - (noiseY(vec4(x + dz, time)) - noiseY(vec4(x - dz, time))),
    (noiseX(vec4(x + dz, time)) - noiseX(vec4(x - dz, time))) - (noiseZ(vec4(x + dx, time)) - noiseZ(vec4(x - dx, time))),
    (noiseY(vec4(x + dx, time)) - noiseY(vec4(x - dx, time))) - (noiseX(vec4(x + dy, time)) - noiseX(vec4(x - dy, time)))
  ) / (2.0 * e);
}
vec3 limit(vec3 v, float max) {
  if (length(v) > max) {
    return normalize(v) * max;
  }
  return v;
}
void main(void) {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec3 nextPosition, nextVelocity;
  if (coord.y == 0) {
    vec3 velocity = texelFetch(velocityTexture, coord, 0).xyz;
    vec3 position = texelFetch(positionTexture, coord, 0).xyz;
    vec3 acceleration = curlnoise(position * 1.0, time * 0.2);
    acceleration = mix(acceleration, -normalize(position), smoothstep(0.01, 0.1 * 1.05, length(position)));
    nextVelocity = 1.0 * limit(velocity + deltaTime * acceleration, 0.8);
    nextPosition = position + deltaTime * nextVelocity;
  } else {
    nextPosition = texelFetch(positionTexture, ivec2(coord.x, coord.y - 1), 0).xyz;
    nextVelocity = texelFetch(velocityTexture, ivec2(coord.x, coord.y - 1), 0).xyz;
  }
  outPosition = nextPosition;
  outVelocity = nextVelocity;
}