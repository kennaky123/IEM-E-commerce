import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface ConstellationItem {
  id: string;
  title: string;
  subtitle?: string;
  rating?: number;
  images: string[];
}

interface ThreeHeroConstellationProps {
  items: ConstellationItem[];
  onSelectItem?: (item: ConstellationItem) => void;
}

interface CardSlotConfig {
  x: number;
  y: number;
  z: number;
  rotZ: number;
  rotY: number;
  scale: number;
  phase: number;
}

const DESKTOP_SLOTS: CardSlotConfig[] = [
  { x: -4.85, y: 0.92, z: -0.6, rotZ: 0.08, rotY: 0.14, scale: 0.94, phase: 0.2 },
  { x: -3.25, y: -0.62, z: 0.35, rotZ: -0.06, rotY: 0.18, scale: 0.98, phase: 1.1 },
  { x: -1.78, y: 1.08, z: -0.15, rotZ: -0.04, rotY: 0.08, scale: 0.88, phase: 2.0 },
  { x: -0.45, y: -1.04, z: 0.55, rotZ: 0.04, rotY: -0.05, scale: 0.92, phase: 2.9 },
  { x: 1.25, y: 1.02, z: -0.35, rotZ: 0.06, rotY: -0.1, scale: 0.9, phase: 3.7 },
  { x: 2.85, y: -0.78, z: 0.45, rotZ: 0.05, rotY: -0.14, scale: 1.0, phase: 4.5 },
  { x: 4.55, y: 0.86, z: -0.25, rotZ: -0.07, rotY: -0.18, scale: 0.95, phase: 5.2 },
  { x: -3.95, y: 0.15, z: -1.5, rotZ: -0.09, rotY: 0.12, scale: 0.78, phase: 1.7 },
  { x: 3.85, y: 0.05, z: -1.4, rotZ: 0.09, rotY: -0.12, scale: 0.8, phase: 4.1 },
  { x: 0.25, y: 1.24, z: -1.25, rotZ: -0.03, rotY: 0.02, scale: 0.82, phase: 0.8 },
];

function getViewportFactors(w: number) {
  if (w < 480) {
    return { camZ: 9.6, xFactor: 0.48, yFactor: 1.12, scaleFactor: 0.84 };
  }
  if (w < 768) {
    return { camZ: 8.4, xFactor: 0.68, yFactor: 1.05, scaleFactor: 0.92 };
  }
  return { camZ: 7.2, xFactor: 1.0, yFactor: 1.0, scaleFactor: 1.0 };
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function paintCardCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement | null,
  item: ConstellationItem
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Outer pillow-soft white surface (28px scaled)
  ctx.save();
  drawRoundedRectPath(ctx, 8, 8, w - 16, h - 16, 48);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#ebebeb';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner 1:1 image frame (20px scaled, top bleed w/ subtle frame)
  const imgBoxPad = 24;
  const imgBoxSize = w - imgBoxPad * 2;
  drawRoundedRectPath(ctx, imgBoxPad, imgBoxPad, imgBoxSize, imgBoxSize * 0.86, 36);
  ctx.fillStyle = '#f2f4f5';
  ctx.fill();
  ctx.clip();

  if (img && img.naturalWidth > 0) {
    const boxW = imgBoxSize;
    const boxH = imgBoxSize * 0.86;
    const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const dx = imgBoxPad + (boxW - drawW) / 2;
    const dy = imgBoxPad + (boxH - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  }
  ctx.restore();

  // Title text in ink-black (#000000), GT Standard 14px-equivalent negative tracking
  const textY = imgBoxPad + imgBoxSize * 0.86 + 44;
  ctx.fillStyle = '#000000';
  ctx.font = '400 26px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const cleanTitle =
    item.title.length > 22 ? `${item.title.slice(0, 21)}…` : item.title;
  ctx.fillText(cleanTitle, 32, textY);

  // Star rating + count caption (#787574 muted gray)
  const starsY = textY + 34;
  const ratingVal = (item.rating ?? 4.9).toFixed(1);
  ctx.fillStyle = '#5433eb';
  ctx.font = '400 20px Inter, system-ui, sans-serif';
  ctx.fillText('★★★★★', 32, starsY);

  ctx.fillStyle = '#787574';
  ctx.font = '400 18px Inter, system-ui, sans-serif';
  ctx.fillText(`${ratingVal} • Studio ${item.images.length}P`, 148, starsY);
}

function createSoftShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 300;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 150, 24, 128, 150, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.06)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 300);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export const ThreeHeroConstellation: React.FC<ThreeHeroConstellationProps> = ({
  items,
  onSelectItem,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);
  const [webglReady, setWebglReady] = useState(true);

  useEffect(() => {
    const mountEl = containerRef.current;
    if (!mountEl || items.length === 0) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglReady(false);
      return;
    }

    const width = mountEl.clientWidth || 1100;
    const height = mountEl.clientHeight || 380;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountEl.appendChild(renderer.domElement);

    let vf = getViewportFactors(width);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 0, vf.camZ);

    const group = new THREE.Group();
    scene.add(group);

    const cardGeom = new THREE.PlaneGeometry(1.52, 1.84);
    const shadowGeom = new THREE.PlaneGeometry(1.88, 2.2);
    const shadowTexture = createSoftShadowTexture();

    const activeItems = DESKTOP_SLOTS.map(
      (_, i) => items[i % items.length]
    );

    interface CardNode {
      holder: THREE.Group;
      mesh: THREE.Mesh;
      canvas: HTMLCanvasElement;
      texture: THREE.CanvasTexture;
      material: THREE.MeshBasicMaterial;
      shadowMat: THREE.MeshBasicMaterial;
      slot: CardSlotConfig;
      item: ConstellationItem;
      imgIdx: number;
      flipProgress: number; // 0 idle, >0..1 animating flip
      swappedInFlip: boolean;
      hoverScale: number;
    }

    const nodes: CardNode[] = [];
    const disposableImages: HTMLImageElement[] = [];

    const loadCardImage = (
      node: CardNode,
      url: string
    ) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      disposableImages.push(img);
      img.onload = () => {
        paintCardCanvas(node.canvas, img, node.item);
        node.texture.needsUpdate = true;
      };
      img.src = url;
    };

    activeItems.forEach((item, idx) => {
      const slot = DESKTOP_SLOTS[idx];
      const holder = new THREE.Group();
      holder.position.set(slot.x * vf.xFactor, slot.y * vf.yFactor, slot.z);
      holder.rotation.set(0, slot.rotY, slot.rotZ);
      holder.scale.setScalar(slot.scale * vf.scaleFactor);

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 620;
      paintCardCanvas(canvas, null, item);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      });

      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
      });

      const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
      shadowMesh.position.set(0, -0.07, -0.03);
      holder.add(shadowMesh);

      const mesh = new THREE.Mesh(cardGeom, material);
      mesh.userData = { index: idx };
      holder.add(mesh);
      group.add(holder);

      const node: CardNode = {
        holder,
        mesh,
        canvas,
        texture,
        material,
        shadowMat,
        slot,
        item,
        imgIdx: 0,
        flipProgress: 0,
        swappedInFlip: false,
        hoverScale: 1,
      };
      nodes.push(node);

      if (item.images[0]) {
        loadCardImage(node, item.images[0]);
      }
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(99, 99);
    let pointerActive = false;
    let hoveredIndex: number | null = null;
    let rafId = 0;
    let flipCursor = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerActive = true;
    };

    const onPointerLeave = () => {
      pointerActive = false;
      hoveredIndex = null;
      setHoveredTitle(null);
      renderer.domElement.style.cursor = 'default';
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const clickVec = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(clickVec, camera);
      const hits = raycaster.intersectObjects(nodes.map((n) => n.mesh));
      if (hits.length > 0) {
        const hitIdx = hits[0].object.userData.index as number;
        const targetNode = nodes[hitIdx];
        if (targetNode) {
          onSelectItem?.(targetNode.item);
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const flipTimer = reduceMotion
      ? null
      : window.setInterval(() => {
          if (nodes.length === 0) return;
          const n = nodes[flipCursor % nodes.length];
          flipCursor += 1;
          if (n && n.item.images.length > 1 && n.flipProgress === 0) {
            n.flipProgress = 0.001;
            n.swappedInFlip = false;
          }
        }, 2100);

    const onResize = () => {
      if (!mountEl) return;
      const nextW = mountEl.clientWidth || 1100;
      const nextH = mountEl.clientHeight || 380;
      vf = getViewportFactors(nextW);
      camera.position.z = vf.camZ;
      camera.aspect = nextW / nextH;
      camera.updateProjectionMatrix();
      renderer.setSize(nextW, nextH);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();

    const animate = () => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      if (pointerActive) {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(nodes.map((n) => n.mesh));
        if (hits.length > 0) {
          const hitIdx = hits[0].object.userData.index as number;
          if (hoveredIndex !== hitIdx) {
            hoveredIndex = hitIdx;
            setHoveredTitle(nodes[hitIdx]?.item.title ?? null);
          }
          renderer.domElement.style.cursor = 'pointer';
        } else if (hoveredIndex !== null) {
          hoveredIndex = null;
          setHoveredTitle(null);
          renderer.domElement.style.cursor = 'default';
        }
      }

      // Smooth pointer parallax on whole constellation
      const targetRotY = pointerActive ? pointer.x * 0.14 : 0;
      const targetRotX = pointerActive ? -pointer.y * 0.08 : 0;
      group.rotation.y += (targetRotY - group.rotation.y) * 0.07;
      group.rotation.x += (targetRotX - group.rotation.x) * 0.07;

      nodes.forEach((n, idx) => {
        const floatY = reduceMotion
          ? 0
          : Math.sin(elapsed * 1.15 + n.slot.phase) * 0.12;
        const floatRotZ = reduceMotion
          ? 0
          : Math.cos(elapsed * 0.75 + n.slot.phase) * 0.025;

        n.holder.position.x = n.slot.x * vf.xFactor;
        n.holder.position.y = n.slot.y * vf.yFactor + floatY;
        n.holder.rotation.z = n.slot.rotZ + floatRotZ;

        // Multi-angle 3D spin swap
        let spinY = 0;
        if (n.flipProgress > 0) {
          n.flipProgress += dt * 1.15;
          if (n.flipProgress >= 0.5 && !n.swappedInFlip) {
            n.swappedInFlip = true;
            n.imgIdx = (n.imgIdx + 1) % n.item.images.length;
            loadCardImage(n, n.item.images[n.imgIdx]);
          }
          if (n.flipProgress >= 1) {
            n.flipProgress = 0;
            n.swappedInFlip = false;
          } else {
            spinY = n.flipProgress * Math.PI * 2;
          }
        }
        n.holder.rotation.y = n.slot.rotY + spinY;

        const targetHover = hoveredIndex === idx ? 1.13 : 1.0;
        n.hoverScale += (targetHover - n.hoverScale) * 0.14;
        n.holder.scale.setScalar(n.slot.scale * vf.scaleFactor * n.hoverScale);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(rafId);
      if (flipTimer !== null) window.clearInterval(flipTimer);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);

      nodes.forEach((n) => {
        n.texture.dispose();
        n.material.dispose();
        n.shadowMat.dispose();
      });
      cardGeom.dispose();
      shadowGeom.dispose();
      shadowTexture.dispose();
      disposableImages.forEach((img) => {
        img.onload = null;
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, [items, onSelectItem]);

  return (
    <div className="relative w-full h-[240px] sm:h-[340px] md:h-[400px] overflow-hidden select-none">
      {/* Three.js WebGL Floating Product Constellation */}
      {webglReady ? (
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      ) : (
        <div className="mx-auto max-w-[960px] h-full grid grid-cols-3 sm:grid-cols-5 gap-3 items-center px-4 opacity-90">
          {items.slice(0, 5).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem?.(item)}
              className="shop-card p-2 text-left cursor-pointer"
            >
              <img
                src={item.images[0]}
                alt={item.title}
                className="aspect-square w-full rounded-[20px] object-contain bg-[#f2f4f5]"
              />
              <div className="px-1.5 pt-2 text-[12px] truncate text-[#000000]">
                {item.title}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Centered #5433eb 'shop' Wordmark Floating in Constellation Center */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
        <div className="rounded-full bg-[#ffffff]/80 backdrop-blur-[6px] px-5 py-1.5 sm:px-7 sm:py-2 shadow-[0_4px_24px_rgba(0,0,0,0.06)] flex flex-col items-center">
          <div className="text-[38px] sm:text-[64px] leading-none tracking-[-0.06em] text-[#5433eb] font-normal flex items-baseline">
            <span>shop</span>
            <span className="ml-0.5 inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-[#5433eb]" />
          </div>
          <span className="mt-1 text-[10px] sm:text-[11px] max-w-[230px] sm:max-w-none truncate tracking-[-0.017em] text-[#787574]">
            {hoveredTitle
              ? `Inspect ${hoveredTitle}`
              : 'Three.js 3D Studio SongLong Constellation'}
          </span>
        </div>
      </div>
    </div>
  );
};
