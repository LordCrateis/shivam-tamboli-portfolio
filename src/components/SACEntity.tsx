import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

const OBSERVE_MARGIN = 90; // px — how far outside the sphere's box the cursor still counts as "observing"
const SPHERE_RADIUS = 1.3;
const SPHERE_SEGMENTS = 72;

export default function SACEntity() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [observed, setObserved] = useState(false);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) {
      return;
    }

    let animationFrameId = 0;
    let disposed = false;

    const width = mountEl.clientWidth || 1;
    const height = mountEl.clientHeight || 1;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5);

    const ambient = new THREE.AmbientLight(0xeae8df, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0xeae8df, 1.6, 20);
    keyLight.position.set(3, 3.4, 4);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xffffff, 0.5, 20);
    rimLight.position.set(-3.5, -2, 2.5);
    scene.add(rimLight);

    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
    const positionAttribute = geometry.attributes.position as THREE.BufferAttribute;
    const positions = positionAttribute.array as Float32Array;
    const basePositions = Float32Array.from(positions);
    const vertexCount = positionAttribute.count;

    const material = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.55,
      metalness: 0.14,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const noise3D = createNoise3D();

    const mouseNdc = { x: 2, y: 2 }; // start off-screen
    const observedTarget = { current: 0 };
    const observedFactor = { current: 0 };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountEl.getBoundingClientRect();
      mouseNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNdc.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

      const withinX = event.clientX >= rect.left - OBSERVE_MARGIN && event.clientX <= rect.right + OBSERVE_MARGIN;
      const withinY = event.clientY >= rect.top - OBSERVE_MARGIN && event.clientY <= rect.bottom + OBSERVE_MARGIN;
      const nextTarget = withinX && withinY ? 1 : 0;

      if (nextTarget !== observedTarget.current) {
        observedTarget.current = nextTarget;
        setObserved(nextTarget === 1);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    const resizeObserver = new ResizeObserver(() => {
      const w = mountEl.clientWidth || 1;
      const h = mountEl.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(mountEl);

    const startTime = performance.now();

    const animate = (now: number) => {
      if (disposed) {
        return;
      }

      const elapsed = (now - startTime) / 1000;

      observedFactor.current += (observedTarget.current - observedFactor.current) * 0.06;

      const mouseDirX = mouseNdc.x;
      const mouseDirY = mouseNdc.y;
      const mouseDirZ = 0.6;
      const mouseDirLen = Math.sqrt(mouseDirX * mouseDirX + mouseDirY * mouseDirY + mouseDirZ * mouseDirZ) || 1;
      const mdx = mouseDirX / mouseDirLen;
      const mdy = mouseDirY / mouseDirLen;
      const mdz = mouseDirZ / mouseDirLen;

      for (let i = 0; i < vertexCount; i += 1) {
        const idx = i * 3;
        const bx = basePositions[idx];
        const by = basePositions[idx + 1];
        const bz = basePositions[idx + 2];
        const baseLen = Math.sqrt(bx * bx + by * by + bz * bz) || SPHERE_RADIUS;

        const nx = bx / baseLen;
        const ny = by / baseLen;
        const nz = bz / baseLen;

        const n1 = noise3D(nx * 1.8 + elapsed * 0.25, ny * 1.8 + elapsed * 0.25, nz * 1.8 + elapsed * 0.25);
        const n2 = noise3D(nx * 4.5 - elapsed * 0.4, ny * 4.5 - elapsed * 0.4, nz * 4.5 - elapsed * 0.4) * 0.4;
        const idleDisplacement = (n1 + n2) * 0.16;

        const alignment = Math.max(0, nx * mdx + ny * mdy + nz * mdz);
        const tendrilReach = Math.pow(alignment, 4) * 0.55 * observedFactor.current;

        const newLen = baseLen + idleDisplacement + tendrilReach;
        positions[idx] = nx * newLen;
        positions[idx + 1] = ny * newLen;
        positions[idx + 2] = nz * newLen;
      }

      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();

      mesh.rotation.y += 0.0016;
      mesh.rotation.x = Math.sin(elapsed * 0.15) * 0.08;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 lg:block"
      style={{ width: 440, height: 440 }}
    >
      <div className="absolute inset-8 rounded-full bg-ink/10 blur-3xl" />
      <div ref={mountRef} className="relative h-full w-full" />

      <div className="absolute left-1/2 bottom-2 flex -translate-x-1/2 translate-y-full flex-col items-center gap-1.5 pt-4">
        <span className="terminal-text text-[10px] tracking-widest text-ink-muted uppercase">S.A.C.</span>
        <span
          className={`terminal-text inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase transition-colors duration-300 ${
            observed ? 'text-[#2a9d8f]' : 'text-ink-muted'
          }`}
        >
          <span className={`h-1 w-1 rounded-full ${observed ? 'bg-[#2a9d8f]' : 'bg-ink-muted'}`} />
          {observed ? 'Collapsed — Observed' : 'Superposition'}
        </span>
      </div>
    </div>
  );
}