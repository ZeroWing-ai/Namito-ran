
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
        // Ensure color is a Color object or hex
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

        // Spawn Obstacles (Legacy logic, mostly handled by segments now but kept for fallback)
        if (addObstacles) {
            // ... old logic, maybe skip to rely on segment logic? 
            // Let's keep a simple random one just in case
        }

        return platform;
    }

    generateNextChunk() {
        // Decide segment type
        const rand = Math.random();

        if (rand < 0.4) {
            this.generateStandardSegment();
        } else if (rand < 0.6) {
            this.generateFlatRunSegment();
        } else if (rand < 0.8) {
            this.generateSlideSegment();
        } else {
            this.generateDodgeSegment();
        }
    }

    generateStandardSegment() {
        const count = 3 + Math.floor(Math.random() * 3);
        let currentZ = this.lastChunkZ;

        for (let i = 0; i < count; i++) {
            // EASIER GAPS
            const gap = 5 + Math.random() * 5;
            const depth = 15 + Math.random() * 10;
            const width = 8 + Math.random() * 4;
            const x = (Math.random() - 0.5) * 12;
            const y = Math.max(-5, Math.min(5, (Math.random() - 0.5) * 5));

            const color = this.colors[Math.floor(Math.random() * this.colors.length)];

            currentZ -= gap;
            this.spawnPlatform(x, y, currentZ - depth / 2, width, depth, color, Math.random() > 0.6);
            currentZ -= depth;
        }
        this.lastChunkZ = currentZ;
    }

    generateFlatRunSegment() {
        const gap = 4;
        const depth = 60 + Math.random() * 40;
        const width = 12;
        this.lastChunkZ -= gap;
        const z = this.lastChunkZ - depth / 2;

        const platform = this.spawnPlatform(0, 0, z, width, depth, 0x00aaff, false);

        const obsCount = Math.floor(depth / 15);
        for (let i = 0; i < obsCount; i++) {
            this.spawnObstacleOnPlatform(platform, width, depth, i * (depth / obsCount) - depth / 2 + 5);
        }
        this.lastChunkZ -= depth;
    }

    generateSlideSegment() {
        const count = 3;
        let currentZ = this.lastChunkZ;
        const color = 0xff00ff;

        for (let i = 0; i < count; i++) {
            const gap = 4;
            const depth = 20;
            const width = 12;
            currentZ -= gap;

            const platform = this.spawnPlatform(0, 0, currentZ - depth / 2, width, depth, color, false);

            // Barrier for crouching
            // Needs to be orange (0xffaa00)
            const barrier = new THREE.Mesh(
                new THREE.BoxGeometry(width, 2, 1),
                new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xaa4400 })
            );
            barrier.position.set(0, 2.5, currentZ - depth / 2);
            this.scene.add(barrier);
            this.platforms.push({ mesh: barrier, boundingBox: new THREE.Box3().setFromObject(barrier), type: 'obstacle' });

            currentZ -= depth;
        }
        this.lastChunkZ = currentZ;
    }

    generateDodgeSegment() {
        const gap = 4;
        const depth = 50;
        const width = 20;
        this.lastChunkZ -= gap;
        const z = this.lastChunkZ - depth / 2;

        const platform = this.spawnPlatform(0, 0, z, width, depth, 0xffff00, false);

        const rows = 5;
        for (let i = 0; i < rows; i++) {
            const zPos = z + (i - rows / 2) * (depth / rows);
            const spots = [-6, 0, 6];
            const safeSpot = Math.floor(Math.random() * 3);
            spots.forEach((xPos, idx) => {
                if (idx !== safeSpot) {
                    const pill = new THREE.Mesh(
                        new THREE.BoxGeometry(4, 4, 4),
                        new THREE.MeshStandardMaterial({ color: 0xff4444 })
                    );
                    pill.position.set(xPos, 2, zPos);
                    this.scene.add(pill);
                    this.platforms.push({ mesh: pill, boundingBox: new THREE.Box3().setFromObject(pill), type: 'obstacle' });
                }
            });
        }
        this.lastChunkZ -= depth;
    }

    spawnObstacleOnPlatform(platform, pWidth, pDepth, localZ) {
        const wH = 2 + Math.random();
        const wW = pWidth * (0.3 + Math.random() * 0.4);
        const wD = 1;
        const x = (Math.random() - 0.5) * (pWidth - wW);

        const obs = new THREE.Mesh(
            new THREE.BoxGeometry(wW, wH, wD),
            new THREE.MeshStandardMaterial({ color: 0xff0044 })
        );
        obs.position.set(platform.position.x + x, platform.position.y + 0.5 + wH / 2, platform.position.z + localZ);
        this.scene.add(obs);
        this.platforms.push({ mesh: obs, boundingBox: new THREE.Box3().setFromObject(obs), type: 'obstacle' });
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
            oldPlatform.mesh.geometry.dispose();
            oldPlatform.mesh.material.dispose();
        }
    }
}
