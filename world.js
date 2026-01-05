
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

        // --- RESTORE LIGHTING ---
        // Ambient Light (Base brightness)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional Light (Sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

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

        // We have manually generated 4 segments above.
        // Start Zone (CP 1) + 4 Segments (CP 2,3,4,5).
        // To put Goal at CP 100, we need the 99th generated segment to be the goal.
        this.generatedChunks = 4;

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
        platformObj.isPermanent = true; // NEVER DELETE

        // Spawn Beacon
        // Beacon sits on top. Top is at 0.5. Beacon should be at y=0 (spawnCheckpoint adds +2, so y=2)
        const beaconObj = this.spawnCheckpoint(0, 0, z);
        platformObj.linkedBeacon = beaconObj;

        // Set to Green (Collected)
        beaconObj.mesh.material.color.setHex(0x00ff00);
        beaconObj.mesh.children[0].color.setHex(0x00ff00);
    }

    // ... (spawnCheckpoint, getDifficulty, generateCheckpointSegment, generateNextChunk etc. unchanged) ...

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

        // --- SAFETY WALLS for Goal ---
        const wallHeight = 10;
        const wallThickness = 2;
        const wallColor = 0xddaadd; // Light energetic color

        // Left Wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, depth),
            new THREE.MeshStandardMaterial({ color: wallColor, transparent: true, opacity: 0.5 })
        );
        leftWall.position.set(-width / 2 - wallThickness / 2, wallHeight / 2 - 2, z);
        this.scene.add(leftWall);
        this.platforms.push({ mesh: leftWall, boundingBox: new THREE.Box3().setFromObject(leftWall), type: 'obstacle' });

        // Right Wall
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, depth),
            new THREE.MeshStandardMaterial({ color: wallColor, transparent: true, opacity: 0.5 })
        );
        rightWall.position.set(width / 2 + wallThickness / 2, wallHeight / 2 - 2, z);
        this.scene.add(rightWall);
        this.platforms.push({ mesh: rightWall, boundingBox: new THREE.Box3().setFromObject(rightWall), type: 'obstacle' });

        // Back Wall (End of game)
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(width + wallThickness * 2, wallHeight, wallThickness),
            new THREE.MeshStandardMaterial({ color: wallColor, transparent: true, opacity: 0.5 })
        );
        backWall.position.set(0, wallHeight / 2 - 2, z - depth / 2 - wallThickness / 2);
        this.scene.add(backWall);
        this.platforms.push({ mesh: backWall, boundingBox: new THREE.Box3().setFromObject(backWall), type: 'obstacle' });


        // Victory Light
        const victoryLight = new THREE.PointLight(0xffaa00, 2, 100);
        victoryLight.position.set(0, 20, z);
        this.scene.add(victoryLight);
        // ...
    }

    update(playerZ) {
        // Generate new chunks ahead of player
        if (playerZ < this.lastChunkZ + this.renderDistance) {
            this.generateNextChunk();
        }

        // Cleanup old chunks
        // Loop through platforms to find removables
        // Limit total active platforms to 300 to keep performance up, 
        // BUT skip IS_PERMANENT ones.
        while (this.platforms.length > 300) {
            // Check the first element (oldest)
            if (this.platforms[0].isPermanent) {
                // If the oldest is permanent, we cannot simply shift() it out.
                // We should check if there are non-permanent items we can remove.
                // However, preserving order is tricky if we skip.
                // For simplicity: permanent items (Start Zone) are always at the start.
                // If we encounter a permanent item, we arguably *shouldn't* count it towards the "removable budget" 
                // or just verify if we have *generated* enough ephemeral chunks to start deleting.

                // Let's protect indices 0..N that are permanent.
                // We will only delete if we find a non-permanent one.

                // Quick fix: Rotate? No.
                // Better: Just ignore the cleanup trigger if the head is permanent?
                // No, then we never clean up.

                // Hack: Start zone is usually just 1-5 objects.
                // We can just create a separate "permanentPlatforms" list? 

                // EASIEST FIX for current architecture:
                // Move permanent items to a separate list or just don't put them in `this.platforms`?
                // `this.platforms` is used for COLLISION. It must contain everything.

                // Solution: Splice.
                // Find first non-permanent platform.
                let targetIndex = -1;
                for (let i = 0; i < this.platforms.length; i++) {
                    if (!this.platforms[i].isPermanent) {
                        targetIndex = i;
                        break;
                    }
                }

                if (targetIndex !== -1 && targetIndex < this.platforms.length - 20) { // Ensure we don't delete new stuff if all old is perm
                    // Only delete if it's "old enough" (e.g. at the start of the list)
                    // Since we iterate from 0, `targetIndex` is the oldest non-permanent.
                    // Remove it.
                    const oldPlatform = this.platforms.splice(targetIndex, 1)[0];
                    this.scene.remove(oldPlatform.mesh);
                    oldPlatform.mesh.geometry.dispose();
                    oldPlatform.mesh.material.dispose();
                } else {
                    // If everything is permanent or we shouldn't delete yet
                    break;
                }

            } else {
                // Standard removal
                const oldPlatform = this.platforms.shift();
                this.scene.remove(oldPlatform.mesh);
                oldPlatform.mesh.geometry.dispose();
                oldPlatform.mesh.material.dispose();
            }
        }
    }
}
