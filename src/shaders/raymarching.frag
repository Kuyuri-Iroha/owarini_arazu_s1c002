#version 300 es
precision highp float;

uniform sampler2D colorTex;
uniform sampler2D depthTex;
uniform sampler2D normalTex;
uniform vec2 resolution;

layout (location = 0) out vec4 gbuffer0;
layout (location = 1) out vec4 gbuffer1;
layout (location = 2) out vec4 gbuffer2;

#define LOOP_MAX 64
#define RAY_EPS 1e-4
#define PI 3.14159265
#define saturate(x) clamp(x, 0.0, 1.0)

vec2 uv = vec2(0.0, 0.0);

mat2 rot(float r) {
    float c = cos(r), s = sin(r);
    return mat2(c, s, -s, c);
}

// https://iquilezles.org/www/articles/distfunctions/distfunctions.htm
float box(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float map(vec3 p) {
    p = mod(p, vec3(5.0, 5.0, 5.0)) - 2.5;
    for(int i = 0; i < 9; i++) {
    	p = abs(p) - 0.14;
        p.xy = p.xy * rot(float(i+1) * PI / 4.0);
        p.yz = p.yz * rot(float(i+1) * PI / 4.0);
    }
    
    return box(p, vec3(0.1, 0.1, 0.1));
}

vec3 norm(vec3 p) {
    float d = RAY_EPS;
    return normalize(vec3(
        map(p + vec3(d, 0.0, 0.0)) - map(p + vec3(-d, 0.0, 0.0)),
        map(p + vec3(0.0, d, 0.0)) - map(p + vec3(0.0, -d, 0.0)),
        map(p + vec3(0.0, 0.0, d)) - map(p + vec3(0.0, 0.0, -d))
    	));
}

// 出力はフォグの影響度
// https://docs.microsoft.com/ja-jp/windows/win32/direct3d9/fog-formulas?redirectedfrom=MSDN
float fog(float depth) {
    float density = 0.06;
    return 1.0 - saturate(1.0 / exp(density * depth));
}

vec3 objMat(vec3 rp) {
    vec3 albedo = vec3(0.7, 0.7, 0.7);
    return albedo;
}

vec3 skyMat(vec3 rp) {
    return mix(vec3(0.7, 0.7, 0.9), vec3(0.9, 0.7, 0.9), (uv.x + uv.y) * 0.25);
}

void march(vec2 p, float faceDepth, out vec3 outColor, out float outDepth, out vec3 outNormal, out float noHit) {
    float fov = 80.0 * 0.5 * PI / 180.0;
    vec3 cp = vec3(0.0, 0.0, -7.0);

    vec3 cd = normalize(vec3(0.0, 0.0, 0.0) - cp);
    vec3 cs = normalize(cross(cd, vec3(0.0, 1.0, 0.0)));
    vec3 cu = normalize(cross(cs, cd));
    float td = 1.0 / tan(fov / 2.0);
    vec3 rd = normalize(cs * p.x + cu * p.y + cd * td);
    
    vec3 col = vec3(0.0, 0.0, 0.0);
    float depth = 1.0;
    
    int i = 0;
    for(; i < LOOP_MAX; i++) {
        vec3 rp = cp + rd * depth;
        float dist = map(rp);
        
        if(faceDepth < (depth - 1.0) / 10.0) {
          noHit = 1.0;
          depth += dist;
         break;
        }

        if(abs(dist) < RAY_EPS) {
        	col = objMat(rp);
          outNormal = norm(rp);
          depth += dist;
          break;
        }
        
        depth += dist;
    }

    if(i == LOOP_MAX - 1) {
      noHit = 1.0;
    }
    
    outDepth = (depth) / 10.0; // 初期値が 1.0 であるため
    outColor = col;
}


void main()
{
    vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / resolution;
  vec2 uv = p * 0.5 + 0.5;
    vec4 geoDepthCol = texture(depthTex, uv);
    float geoDepth = geoDepthCol.a < 0.1 ? 10000.0 : geoDepthCol.z;
    vec3 col = vec3(0.0);
    vec3 norm = vec3(0.0);
    float depth = 10000.0;
    float noHit = 0.0;
    march(p, geoDepth, col, depth, norm, noHit);

    // Output to screen
    gbuffer0 = noHit == 1.0 ? texture(colorTex, uv) : vec4(col, 1.0);
    gbuffer1 = noHit == 1.0 ? geoDepthCol : vec4(vec3(depth), 1.0);
    gbuffer2 = noHit == 1.0 ? texture(normalTex, uv) : vec4(norm, 1.0);
}