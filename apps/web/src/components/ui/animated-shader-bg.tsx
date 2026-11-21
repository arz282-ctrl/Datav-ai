"use client";

import React, { useEffect, useRef } from "react";

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

varying vec2 v_uv;

// Smooth 2D noise functions
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractional Brownian Motion for fluid undulating dark plasma
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.0 + vec2(0.15, 0.25);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  
  // Smooth subtle mouse interaction
  vec2 mouseNorm = (u_mouse - 0.5) * 0.8;
  st += mouseNorm * 0.15;

  float t = u_time * 0.08;

  // Domain warping for organic silk / fluid flows
  vec2 q = vec2(0.0);
  q.x = fbm(st + vec2(0.0, t * 0.6));
  q.y = fbm(st + vec2(1.0, -t * 0.4));

  vec2 r = vec2(0.0);
  r.x = fbm(st + 1.2 * q + vec2(1.7, 9.2) + 0.15 * t);
  r.y = fbm(st + 1.2 * q + vec2(8.3, 2.8) + 0.126 * t);

  float f = fbm(st + 1.6 * r + 0.05 * sin(t));

  // Color Palette tailored to glass cards (Obsidian Black base, Deep Emerald Teal, Warm Amber/Ochre rim)
  vec3 bgBlack    = vec3(0.024, 0.024, 0.028);     // #060607 deep obsidian
  vec3 deepTeal   = vec3(0.035, 0.18, 0.15);       // #092e26 deep teal velvet
  vec3 brightTeal = vec3(0.25, 0.72, 0.60);       // #40b899 luminous teal
  vec3 warmAmber  = vec3(0.48, 0.25, 0.06);       // #7a400f dark amber
  vec3 rimGlow    = vec3(0.85, 0.65, 0.35);       // #d9a659 soft gold highlight

  // Liquid blending
  vec3 col = bgBlack;
  col = mix(col, deepTeal, clamp(length(q) * 0.85, 0.0, 1.0));
  col = mix(col, warmAmber, clamp(length(r.x) * 0.45, 0.0, 1.0));
  col = mix(col, brightTeal, clamp(pow(f, 3.5) * 1.8, 0.0, 1.0));
  col = mix(col, rimGlow, clamp(pow(r.y, 4.0) * 0.6, 0.0, 1.0));

  // Add subtle edge vignette to keep the background deep black at borders
  float vignette = 1.0 - smoothstep(0.4, 1.5, length(st));
  col = mix(bgBlack * 0.5, col, vignette);

  // Subtle luminous pulsing energy
  col += vec3(0.015, 0.04, 0.035) * (0.5 + 0.5 * sin(u_time * 0.3 + length(st) * 3.0));

  gl_FragColor = vec4(col, 1.0);
}
`;

export function DynamicShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      powerPreference: "high-performance",
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
    });

    if (!gl) {
      console.warn("WebGL not supported; falling back to dark CSS background.");
      return;
    }

    // Compile shader helper
    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vert = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const frag = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Full screen quad geometry
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");

    let animId = 0;
    let startTime = performance.now();
    let mouse = { x: 0.5, y: 0.5 };
    let targetMouse = { x: 0.5, y: 0.5 };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.x = e.clientX / window.innerWidth;
      targetMouse.y = 1.0 - e.clientY / window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    window.addEventListener("resize", resize);
    resize();

    const render = () => {
      // Smooth mouse lerp
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;

      const elapsed = (performance.now() - startTime) * 0.001;

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uMouse, mouse.x, mouse.y);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vert);
        gl.deleteShader(frag);
        gl.deleteBuffer(quadBuffer);
      }
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 -z-20 h-full w-full pointer-events-none select-none"
        style={{
          background: "#060608",
        }}
      />
      {/* Subtle micro-grain overlay for velvety texture under frosted glass */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 pointer-events-none select-none bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-teal-900/10 via-transparent to-black/60"
      />
    </>
  );
}
export default DynamicShaderBackground;
