
import * as THREE from 'three';

export class World {

    constructor(scene) {
        this.scene = scene;
        this.platforms = [];
        this.chunkSize = 50;
        this.renderDistance = 200;
        this.lastChunkZ = -20; // Starting position
        this.chunkSize = 50;
        this.renderDistance = 200;
        this.lastChunkZ = -20; // Starting position
        this.generatedChunks = 0; // Track how many segments created
        this.isGoalGenerated = false;

        this.isGoalGenerated = false;





        // Colors for abstract style (Bright/Neon palette)
        this.colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff5500];

        this.init();
    }

    init() {
        // Fog for depth
        // this.scene.fog = new THREE.Fog(0xaaccff, 20, 150);
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

        // Initial Platforms - SAFE START ZONE
        this.spawnStartZone();

        // Offset for next chunks
        // Start Zone is 20 deep centered at 0, so extends to -10.
        // We set lastChunkZ to -10 to continue seamlessly.
        this.lastChunkZ = -10;


        // Generate initial Safe Sequence
        this.generateFlatRunSegment();     // 1. Safe continuous run
        this.generateWideSegment();        // 2. Wide safe platforms
        this.generateGuidedSegment();      // 3. Guided rails
        this.generateStandardSegment();    // 4. Standard jump

        // Generate a few random chunks ahead
        for (let i = 0; i < 3; i++) {
            this.generateNextChunk();
        }
    }


    spawnPlatform(x, y, z, width, depth, color, addObstacles = false, height = 1) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        // Ensure color is a Color object or hex
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.2,
            metalness: 0.1
        });
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(x, y, z);

        // Properties
        platform.isSolid = true;


        // Add subtle glow/edge helper for "abstract" look
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
        platform.add(line);

        this.scene.add(platform);
        const box = new THREE.Box3().setFromObject(platform);
        this.platforms.push({ mesh: platform, boundingBox: box, type: 'platform', isCheckpointPlatform: false });

        return platform;
    }

    spawnStartZone() {
        // Create a Safe Checkpoint Platform at (0,0,0) with extra thickness
        const depth = 20;
        const width = 30; // Wider for safety
        const z = 0;
        const height = 5; // Thick floor to prevent falling through
        // We want the TOP surface to be at y=0.5 (flush with standard height 1 platforms at y=0)
        // Standard platform at y=0 has top at 0.5.
        // Thick platform (5) has top at y + 2.5.
        // We want y + 2.5 = 0.5 => y = -2.0
        const y = -2.0;

        const color = 0x224455;
        const platform = this.spawnPlatform(0, y, z, width, depth, color, false, height);
        platform.material.emissive.setHex(0x112233);

        // Mark as Checkpoint Platform
        const platformObj = this.platforms[this.platforms.length - 1];
        platformObj.isCheckpointPlatform = true;
        platformObj.isCollected = true; // Auto-collected at start

        // Spawn Beacon
        // Beacon sits on top. Top is at 0.5. Beacon should be at y=0 (spawnCheckpoint adds +2, so y=2)
        const beaconObj = this.spawnCheckpoint(0, 0, z);
        platformObj.linkedBeacon = beaconObj;

        // Set to Green (Collected)
        beaconObj.mesh.material.color.setHex(0x00ff00);
        beaconObj.mesh.children[0].color.setHex(0x00ff00);
    }

    spawnCheckpoint(x, y, z) {
        // Visual: Neon Cylinder Gate
        // ... (existing visual code)
        // ...

        // We need to return the object reference to link it
        // But for now, let's just use the collision logic in Player to find it or rely on Floor trigger
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
        const checkpoint = new THREE.Mesh(geometry, material);
        checkpoint.position.set(x, y + 2, z);

        const light = new THREE.PointLight(0x00ffff, 1, 10);
        light.position.set(0, 0, 0);
        checkpoint.add(light);

        this.scene.add(checkpoint);
        const box = new THREE.Box3().setFromObject(checkpoint);
        box.expandByScalar(1);

        const cpObj = { mesh: checkpoint, boundingBox: box, type: 'checkpoint_beacon' }; // Rename type to avoid double trigger if desired
        this.platforms.push(cpObj);

        return cpObj;
    }

    getDifficulty() {
        const distance = Math.abs(this.lastChunkZ);
        // Scale 0.0 to 1.0 over 2000 units
        return Math.min(1.0, distance / 2000);
    }

    generateCheckpointSegment() {
        // Safe Zone Platform for Checkpoint
        const depth = 30; // Deeper safe zone
        const width = 30; // Wider
        const gap = 2; // Small gap to separate from previous

        this.lastChunkZ -= gap;
        const z = this.lastChunkZ - depth / 2;

        const height = 5; // Thick floor
        const y = -2.0;   // Flush top surface

        // Darker "Safe" Color with Glow
        // Making it look like a high-tech landing pad
        const color = 0x224455;

        // Spawn Platform
        const platform = this.spawnPlatform(0, y, z, width, depth, color, false, height);
        platform.material.emissive.setHex(0x112233); // Slight glow

        // Mark as Checkpoint Trigger
        // The platform object in this.platforms array needs the flag
        const platformObj = this.platforms[this.platforms.length - 1];
        platformObj.isCheckpointPlatform = true;
        platformObj.linkedBeacon = null; // Will link below


        // Spawn Checkpoint in center
        const beaconObj = this.spawnCheckpoint(0, 0, z);

        // Link beacon to platform for color change
        platformObj.linkedBeacon = beaconObj;

        this.lastChunkZ -= depth;
    }

    generateNextChunk() {
        if (this.isGoalGenerated) return; // Stop after goal

        this.generatedChunks++;

        // GOAL CHECK
        // For Verification: changing 100 to 5 temporarily
        // Remember to change back to 100!
        const GOAL_TARGET = 100;

        if (this.generatedChunks >= GOAL_TARGET) {
            this.generateGoalPlaza();
            this.isGoalGenerated = true;
            return;
        }

        // Decide segment type

        const rand = Math.random();

        // First 15 checkpoints: Easy Mode
        if (this.generatedChunks <= 15) {
            if (rand < 0.4) this.generateFlatRunSegment();
            else if (rand < 0.7) this.generateWideSegment();
            else this.generateGuidedSegment();
            return;
        }

        if (rand < 0.25) {
            this.generateStandardSegment();
        } else if (rand < 0.5) {
            this.generateFlatRunSegment();
        } else if (rand < 0.65) {
            this.generateSlideSegment(); // Slightly rarer
        } else if (rand < 0.8) {
            this.generateDodgeSegment();
        } else if (rand < 0.9) {
            this.generateWideSegment();
        } else {
            this.generateGuidedSegment();
        }
    }

    generateWideSegment() {
        // Checkpoint with Safe Platform
        this.generateCheckpointSegment();

        // Safe, massive platforms
        const count = 2;
        let currentZ = this.lastChunkZ;

        for (let i = 0; i < count; i++) {
            const gap = 3; // Tiny gap
            const depth = 40;
            const width = 30; // Very Wide

            // Random Height change effectively zero or small
            const y = (Math.random() - 0.5) * 2;

            currentZ -= gap;
            this.spawnPlatform(0, y, currentZ - depth / 2, width, depth, 0x00ffcc, false); // Green/Teal
            currentZ -= depth;
        }
        this.lastChunkZ = currentZ;
    }

    generateGuidedSegment() {
        // Checkpoint with Safe Platform
        this.generateCheckpointSegment();

        // Platforms with Guard Rails
        const count = 3;
        let currentZ = this.lastChunkZ;

        const color = 0xaa00ff; // Purple

        for (let i = 0; i < count; i++) {
            const gap = 5;
            const depth = 25;
            const width = 10;

            currentZ -= gap;

            // Main Platform
            const platform = this.spawnPlatform(0, 0, currentZ - depth / 2, width, depth, color, false);

            // Rails
            const railGeo = new THREE.BoxGeometry(0.5, 1, depth);
            const railMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x555555 });

            const leftRail = new THREE.Mesh(railGeo, railMat);
            leftRail.position.set(-width / 2 + 0.25, 1, currentZ - depth / 2);
            this.scene.add(leftRail);
            // Add collision to rail so you can't fall
            this.platforms.push({ mesh: leftRail, boundingBox: new THREE.Box3().setFromObject(leftRail), type: 'obstacle' });

            const rightRail = new THREE.Mesh(railGeo, railMat);
            rightRail.position.set(width / 2 - 0.25, 1, currentZ - depth / 2);
            this.scene.add(rightRail);
            this.platforms.push({ mesh: rightRail, boundingBox: new THREE.Box3().setFromObject(rightRail), type: 'obstacle' });

            currentZ -= depth;
        }
        this.lastChunkZ = currentZ;
    }

    generateStandardSegment() {
        // Checkpoint with Safe Platform
        this.generateCheckpointSegment();

        const difficulty = this.getDifficulty();
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
        // Checkpoint with Safe Platform
        this.generateCheckpointSegment();

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
        // Checkpoint with Safe Platform
        this.generateCheckpointSegment();

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
        // Checkpoint with Safe Platform
        this.generateCheckpointSegment();

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

    generateGoalPlaza() {
        // Massive Celebration Plaza
        const depth = 100; // Huge safe zone
        const width = 60;  // Wide enough not to fall
        const gap = 2;

        this.lastChunkZ -= gap;
        const z = this.lastChunkZ - depth / 2;

        // Gold/Rainbow Platform
        const color = 0xffd700; // Gold
        // Use height 5 for safety (same as other safe floors)
        const platform = this.spawnPlatform(0, -2.0, z, width, depth, color, false, 5);
        platform.material.emissive.setHex(0x553300);

        // Mark as GOAL and Checkpoint
        const platformObj = this.platforms[this.platforms.length - 1];
        platformObj.isCheckpointPlatform = true; // Still counts as check
        platformObj.isGoalPlatform = true;       // Triggers Win logic immediately on touch

        // Victory Light
        const victoryLight = new THREE.PointLight(0xffaa00, 2, 100);
        victoryLight.position.set(0, 20, z);
        this.scene.add(victoryLight);

        // Decoration: Pillars
        const pillGeo = new THREE.BoxGeometry(2, 20, 2);
        const pillMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00afff });
        const pillars = [-20, 20];
        pillars.forEach(x => {
            const pill = new THREE.Mesh(pillGeo, pillMat);
            pill.position.set(x, 10, z);
            this.scene.add(pill);
        });

        this.lastChunkZ -= depth;
    }

    update(playerZ) {
        // Generate new chunks ahead of player
        if (playerZ < this.lastChunkZ + this.renderDistance) {
            this.generateNextChunk();
        }

        // Cleanup old chunks (optional optimization)
        // Increased limit to 300 to prevent Start Zone from deleting too early
        if (this.platforms.length > 300) {
            const oldPlatform = this.platforms.shift();
            this.scene.remove(oldPlatform.mesh);
            oldPlatform.mesh.geometry.dispose();
            oldPlatform.mesh.material.dispose();
        }
    }
}
