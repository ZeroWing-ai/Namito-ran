
import * as THREE from 'three';

export class World {

    constructor(scene) {
        this.scene = scene;
        this.platforms = [];
        this.chunkSize = 50;
        this.renderDistance = 200;
        this.lastChunkZ = -20; // Starting position

        // Colors for abstract style (Bright/Neon palette)
        this.colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff5500];

        this.init();
    }

    init() {
        // Fog for depth
        this.scene.fog = new THREE.Fog(0xaaccff, 20, 150);
        this.scene.background = new THREE.Color(0xaaccff);

        // Ground plane (decorative below)
        const planeGeo = new THREE.PlaneGeometry(1000, 1000);
        const planeMat = new THREE.MeshBasicMaterial({
            color: 0x222244,
            transparent: true,
            opacity: 0.5
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -50;
        this.scene.add(plane);

        // Initial Platforms
        this.spawnPlatform(0, -2, -20, 10, 50, 0x44aa88); // Start platform

        // Generate initial chunks
        for (let i = 0; i < 5; i++) {
            this.generateNextChunk();
        }
    }


    spawnPlatform(x, y, z, width, depth, color, addObstacles = false) {
        const geometry = new THREE.BoxGeometry(width, 1, depth);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.2,
            metalness: 0.1
        });
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(x, y, z);

        // Add subtle glow/edge helper for "abstract" look
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
        platform.add(line);

        this.scene.add(platform);
        const box = new THREE.Box3().setFromObject(platform);
        this.platforms.push({ mesh: platform, boundingBox: box, type: 'platform' });

        // Spawn Obstacles
        if (addObstacles) {

            // Re-doing obstacle spawning to be separate objects for collision
            const count = Math.floor(Math.random() * 2);
            for (let k = 0; k < count; k++) {
                // Spikes or Walls
                if (Math.random() > 0.5) {
                    // Wall
                    const wH = 3;
                    const wW = width;
                    const wD = 1;
                    const wall = new THREE.Mesh(
                        new THREE.BoxGeometry(wW, wH, wD),
                        new THREE.MeshStandardMaterial({ color: 0xff0044 })
                    );
                    // Leave a gap
                    const gapX = (Math.random() - 0.5) * width * 0.8;
                    // Actually, let's make a partial wall
                    wall.scale.x = 0.5;
                    wall.position.set(x + (Math.random() > 0.5 ? width / 4 : -width / 4), y + wH / 2 + 0.5, z + (Math.random() - 0.5) * depth * 0.8);
                    this.scene.add(wall);
                    this.platforms.push({ mesh: wall, boundingBox: new THREE.Box3().setFromObject(wall), type: 'obstacle' });
                }
            }
        }

        return platform;
    }

    generateNextChunk() {
        // Simple random generation logic
        const zStart = this.lastChunkZ - (Math.random() * 10 + 20); // Gap
        const depth = Math.random() * 20 + 20; // Length of platform
        const width = Math.random() * 10 + 10;
        const x = (Math.random() - 0.5) * 20; // Lateral offset
        const y = (Math.random() - 0.5) * 5; // Height variation

        const color = this.colors[Math.floor(Math.random() * this.colors.length)];

        this.spawnPlatform(x, y, zStart - depth / 2, width, depth, color, true);

        this.lastChunkZ = zStart - depth;

        // Sometimes spawn a second side platform
        if (Math.random() > 0.5) {
            const sideX = x > 0 ? x - 15 : x + 15;
            this.spawnPlatform(sideX, y + (Math.random() * 4 - 2), zStart - depth / 2, width * 0.5, depth * 0.8, this.colors[Math.floor(Math.random() * this.colors.length)], false);
        }
    }

    update(playerZ) {
        // Generate new chunks ahead of player
        if (playerZ < this.lastChunkZ + this.renderDistance) {
            this.generateNextChunk();
        }

        // Cleanup old chunks (optional optimization)
        if (this.platforms.length > 50) {
            const oldPlatform = this.platforms.shift();
            this.scene.remove(oldPlatform.mesh);
            // Dispose geometry/material if needed for memory, usually handled by GC if not referenced, 
            // but Three.js requires explicit dispose for GPU memory.
            oldPlatform.mesh.geometry.dispose();
            oldPlatform.mesh.material.dispose();
        }
    }
}

