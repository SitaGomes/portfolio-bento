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

    // Add stars
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      transparent: true,
    });

    const starsVertices = [];
    for (let i = 0; i < 3000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starsVertices, 3),
    );
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Shooting stars
    const shootingStars: {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      lifespan: number;
      maxLifespan: number;
    }[] = [];

    const createShootingStar = () => {
      // Create a shooting star
      const geometry = new THREE.SphereGeometry(0.5, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Random position far from center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 500;

      mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
      mesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
      mesh.position.z = radius * Math.cos(phi);

      // Velocity toward center but with some randomness
      const velocity = new THREE.Vector3(
        -mesh.position.x / 50 + (Math.random() - 0.5) * 0.5,
        -mesh.position.y / 50 + (Math.random() - 0.5) * 0.5,
        -mesh.position.z / 50 + (Math.random() - 0.5) * 0.5,
      );

      const maxLifespan = 150 + Math.random() * 100;

      scene.add(mesh);
      shootingStars.push({
        mesh,
        velocity,
        lifespan: 0,
        maxLifespan,
      });
    };

    // Create a shooting star every few seconds
    const shootingStarInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        // 30% chance each interval
        createShootingStar();
      }
    }, 2000);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      earth.rotation.y += 0.001;
      countryLines.rotation.y += 0.001;
      stars.rotation.y += 0.0001;

      // Update shooting stars
      shootingStars.forEach((star, index) => {
        star.mesh.position.add(star.velocity);
        star.lifespan++;

        // Fade out as it approaches end of life
        if (star.lifespan > star.maxLifespan * 0.7) {
          (star.mesh.material as THREE.MeshBasicMaterial).opacity =
            1 -
            (star.lifespan - star.maxLifespan * 0.7) / (star.maxLifespan * 0.3);
        }

        // Remove if lifespan ended or too close to center
        if (
          star.lifespan >= star.maxLifespan ||
          star.mesh.position.length() < 120
        ) {
          scene.remove(star.mesh);
          shootingStars.splice(index, 1);
        }
      });

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
      clearInterval(shootingStarInterval);

      // Clean up shooting stars
      shootingStars.forEach((star) => {
        scene.remove(star.mesh);
      });
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 -z-10" />;
};
