import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import worldData from '../lib/world.json';

export const Globe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 200;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.enableZoom = false;

    // Earth geometry
    const earthGeometry = new THREE.SphereGeometry(100, 64, 64);

    // Earth material
    const earthMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.8,
    });

    // Earth mesh
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    // Country outlines
    const countryLines = new THREE.Object3D();

    // Parse GeoJSON data
    worldData.features.forEach((feature) => {
      if (feature.geometry.type === 'Polygon') {
        drawPolygon(feature.geometry.coordinates[0] as number[][]);
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygon) => {
          drawPolygon(polygon[0] as number[][]);
        });
      }
    });

    scene.add(countryLines);

    // Function to draw polygon
    function drawPolygon(coordinates: number[][]) {
      const lineGeometry = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];

      coordinates.forEach((coord) => {
        const lat = coord[1] * (Math.PI / 180);
        const lng = -coord[0] * (Math.PI / 180);
        const x = 100 * Math.cos(lat) * Math.cos(lng);
        const y = 100 * Math.sin(lat);
        const z = 100 * Math.cos(lat) * Math.sin(lng);

        points.push(new THREE.Vector3(x, y, z));
      });

      lineGeometry.setFromPoints(points);

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x3f51b5,
        transparent: true,
        opacity: 0.6,
      });

      const line = new THREE.Line(lineGeometry, lineMaterial);
      countryLines.add(line);
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      earth.rotation.y += 0.001;
      countryLines.rotation.y += 0.001;
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 -z-10" />;
};
