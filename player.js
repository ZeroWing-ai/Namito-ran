import * as THREE from 'three';

export class Player {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;


        // Physics
        this.position = new THREE.Vector3(0, 10, 0); // Start high to drop in
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.gravity = -30;
        this.jumpForce = 15;
        this.moveSpeed = 20;

        // Checkpoint State
        this.lastCheckpoint = new THREE.Vector3(0, 5, 0);
        this.checkpointCount = 0;
        this.totalCheckpoints = 100;


        // Speeds - Adjusted for easier control
        this.baseSpeed = 10;
        this.sprintSpeed = 18;
        this.crouchSpeed = 6;
        this.currentSpeed = this.baseSpeed;

        this.radius = 1;
        this.normalHeight = 2;
        this.crouchHeight = 1;
        this.height = this.normalHeight;

        // Visuals
        this.baseFOV = 75;
        this.sprintFOV = 85;

        this.onGround = false;

        // Input state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isSprinting = false;
        this.isCrouching = false;
        this.spacePressed = false;

        this.initInput();

        this.createBody();
        this.lockPointer();
    }

    initInput() {
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
    }

    lockPointer() {
        // Pointer lock handled in main.js click event, but we listen for mouse movement here
    }

    onMouseMove(event) {
        if (document.pointerLockElement !== document.body) return;

        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        this.camera.rotation.y -= movementX * 0.002;
        // Clamp pitch maybe? (Not strictly necessary for a runner but good for FPS)
        // this.camera.rotation.x -= movementY * 0.002;
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': this.moveForward = true; break;
            case 'ArrowLeft':
            case 'KeyA': this.moveLeft = true; break;
            case 'ArrowDown':
            case 'KeyS': this.moveBackward = true; break;

            case 'ArrowRight':
            case 'KeyD': this.moveRight = true; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.isSprinting = true; break;
            case 'KeyC':
            case 'ControlLeft': this.isCrouching = true; break;
            case 'Space':
                if (this.onGround && !this.isCrouching) {
                    this.velocity.y = this.jumpForce;
                    this.onGround = false;
                }
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': this.moveForward = false; break;
            case 'ArrowLeft':
            case 'KeyA': this.moveLeft = false; break;
            case 'ArrowDown':
            case 'KeyS': this.moveBackward = false; break;
            case 'ArrowRight':
            case 'KeyD': this.moveRight = false; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.isSprinting = false; break;
            case 'KeyC':
            case 'ControlLeft': this.isCrouching = false; break;
        }
    }



    createBody() {
        // Hands
        this.handGroup = new THREE.Group();
        this.camera.add(this.handGroup);

        // Material
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.3 }); // Light skin tone style or abstract
        const gloveMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.1 }); // Stylized

        // Hands visualization (Floating Cubes/Gloves)
        const handGeo = new THREE.BoxGeometry(0.2, 0.2, 0.4);

        this.leftHand = new THREE.Mesh(handGeo, gloveMat);
        this.leftHand.position.set(-0.4, -0.3, -0.6);
        this.handGroup.add(this.leftHand);

        this.rightHand = new THREE.Mesh(handGeo, gloveMat);
        this.rightHand.position.set(0.4, -0.3, -0.6);
        this.handGroup.add(this.rightHand);

        // Feet
        // Feet should be visible when looking down or during jumps, slightly visible at bottom
        const footGeo = new THREE.BoxGeometry(0.25, 0.15, 0.5);
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0xff0055, roughness: 0.2 }); // Namito shoe color? Red/Pink abstract

        this.leftFoot = new THREE.Mesh(footGeo, shoeMat);
        this.leftFoot.position.set(-0.3, -1.5, -0.2); // Lower relative to camera
        this.handGroup.add(this.leftFoot);

        this.rightFoot = new THREE.Mesh(footGeo, shoeMat);
        this.rightFoot.position.set(0.3, -1.5, -0.2);
        this.handGroup.add(this.rightFoot);

        // Ensure camera is added to scene or hands won't render if camera not in scene graph (usually it is added in Game)
        this.scene.add(this.camera);
    }


    update(delta, platforms) {
        // Friction / Damping
        this.velocity.x -= this.velocity.x * 10 * delta;
        this.velocity.z -= this.velocity.z * 10 * delta;

        // Handle Crouch Height
        const targetHeight = this.isCrouching ? this.crouchHeight : this.normalHeight;
        this.height += (targetHeight - this.height) * 10 * delta;

        // Target Speed & FOV
        let targetSpeed = this.baseSpeed;
        if (this.isSprinting && !this.isCrouching) targetSpeed = this.sprintSpeed;
        if (this.isCrouching) targetSpeed = this.crouchSpeed;

        this.currentSpeed += (targetSpeed - this.currentSpeed) * 5 * delta;

        const targetFOV = (this.isSprinting && !this.isCrouching) ? this.sprintFOV : this.baseFOV;
        this.camera.fov += (targetFOV - this.camera.fov) * 5 * delta;
        this.camera.updateProjectionMatrix();

        // Input Movement (Relative to Camera look)
        const direction = new THREE.Vector3();
        if (this.moveForward) direction.z = -1;
        if (this.moveBackward) direction.z = 1;
        if (this.moveLeft) direction.x = -1;
        if (this.moveRight) direction.x = 1;

        if (direction.length() > 0) direction.normalize();

        const isMoving = direction.length() > 0;

        if (this.moveForward || this.moveBackward) {
            const v = direction.clone().applyEuler(new THREE.Euler(0, this.camera.rotation.y, 0));
            this.velocity.x += v.x * this.currentSpeed * delta * 50;
            this.velocity.z += v.z * this.currentSpeed * delta * 50;
        }
        if (this.moveLeft || this.moveRight) {
            const v = direction.clone().applyEuler(new THREE.Euler(0, this.camera.rotation.y, 0));
            this.velocity.x += v.x * this.currentSpeed * delta * 40; // Reduced lateral speed
            this.velocity.z += v.z * this.currentSpeed * delta * 40;
        }


        // Gravity
        this.velocity.y += this.gravity * delta;

        // Apply Position
        this.position.x += this.velocity.x * delta;
        this.position.z += this.velocity.z * delta;
        this.position.y += this.velocity.y * delta;


        // Wall/Map Bounds (Optional: fall off world)
        if (this.position.y < -50) {
            // Respawn at Checkpoint
            this.position.copy(this.lastCheckpoint);
            this.position.y += 10; // Drop from height to prevent clipping
            this.velocity.set(0, 0, 0);

            // Reset Orientation to face forward (-Z)
            // We only want to reset Y rotation (yaw) to 0 or PI depending on model, usually 0 is Back, -Z is likely 0 or PI
            // In Three.js, facing -Z is usually rotation (0,0,0) if camera is default
            this.camera.rotation.set(0, 0, 0);
        }


        // Collision Detection
        this.checkCollisions(platforms);

        // Update Camera Position
        this.camera.position.copy(this.position);

        // Screen Shake (based on speed magnitude)
        if (isMoving && this.onGround) {
            const speedRatio = (this.currentSpeed - this.baseSpeed) / (this.sprintSpeed - this.baseSpeed);
            // Shake intensity increases with sprint
            const shakeAmount = Math.max(0, speedRatio) * 0.05;

            if (shakeAmount > 0) {
                this.camera.position.x += (Math.random() - 0.5) * shakeAmount;
                this.camera.position.y += (Math.random() - 0.5) * shakeAmount;
            }
        }


        // Animate Hands & Feet
        const time = Date.now() * 0.01;

        // Bobbing
        if (isMoving && this.onGround) {
            this.leftHand.position.y = -0.3 + Math.sin(time) * 0.05;
            this.rightHand.position.y = -0.3 + Math.sin(time + Math.PI) * 0.05;

            this.leftFoot.position.z = -0.2 + Math.sin(time) * 0.2;
            this.leftFoot.position.y = -1.5 + Math.max(0, Math.sin(time) * 0.1); // Lift foot

            this.rightFoot.position.z = -0.2 + Math.sin(time + Math.PI) * 0.2;
            this.rightFoot.position.y = -1.5 + Math.max(0, Math.sin(time + Math.PI) * 0.1);
        } else {
            // Idle breathe
            this.leftHand.position.y = -0.3 + Math.sin(time * 0.5) * 0.02;
            this.rightHand.position.y = -0.3 + Math.sin(time * 0.5 + 1) * 0.02;
            this.leftFoot.position.set(-0.3, -1.5, -0.2);
            this.rightFoot.position.set(0.3, -1.5, -0.2);
        }
    }

    checkCollisions(platforms) {
        this.onGround = false;

        for (const platform of platforms) {
            const box = platform.boundingBox;

            const playerBox = new THREE.Box3();
            const center = this.position.clone();

            // Player AABB based on current Height
            // Using logic: Feet = Center.y - this.height
            playerBox.min.set(center.x - 0.5, center.y - this.height, center.z - 0.5);
            playerBox.max.set(center.x + 0.5, center.y + 0.2, center.z + 0.5);

            if (box.intersectsBox(playerBox)) {

                // Checkpoint Logic (Floor Trigger)
                if (platform.isCheckpointPlatform) {
                    // UNIQUE COLLECTION Logic
                    if (!platform.isCollected) {
                        platform.isCollected = true;
                        this.checkpointCount++;
                        this.totalCheckpoints = 100; // Ensure set if not already

                        // Update UI
                        const fill = document.getElementById('progress-fill');
                        const text = document.getElementById('progress-text');
                        if (fill) fill.style.width = this.checkpointCount + '%';
                        if (text) text.textContent = this.checkpointCount + ' / ' + this.totalCheckpoints;
                    }

                    // Activate Checkpoint
                    if (this.lastCheckpoint.distanceTo(platform.mesh.position) > 1) {
                        this.lastCheckpoint.copy(platform.mesh.position);
                        // Visual feedback
                        if (platform.linkedBeacon) {
                            platform.linkedBeacon.mesh.material.color.setHex(0x00ff00);
                            platform.linkedBeacon.mesh.children[0].color.setHex(0x00ff00); // Light
                        }
                        // Floor feedback
                        platform.mesh.material.emissive.setHex(0x00aa00);
                    }
                }

                // Checkpoint Beacon (Optional secondary trigger, or just ignore physics)
                if (platform.type === 'checkpoint_beacon') {
                    continue; // Pass through
                }

                // Determine collision side

                // Box Top
                const boxTop = box.max.y;
                const feetY = this.position.y - this.height;

                // If feet are near top and we are falling...
                if (feetY >= boxTop - 0.5 && this.velocity.y <= 0) {
                    this.position.y = boxTop + this.height; // Stand on top
                    this.velocity.y = 0;
                    this.onGround = true;
                } else {
                    // Push out horizontally
                    // Find smallest overlap
                    const overlapX = Math.min(Math.abs(playerBox.max.x - box.min.x), Math.abs(playerBox.min.x - box.max.x));
                    const overlapZ = Math.min(Math.abs(playerBox.max.z - box.min.z), Math.abs(playerBox.min.z - box.max.z));

                    if (overlapX < overlapZ) {
                        // Push X
                        if (center.x < box.min.x) this.position.x = box.min.x - 0.5;
                        else this.position.x = box.max.x + 0.5;
                        this.velocity.x = 0;
                    } else {
                        // Push Z
                        if (center.z < box.min.z) this.position.z = box.min.z - 0.5;
                        else this.position.z = box.max.z + 0.5;
                        this.velocity.z = 0;
                    }
                }
            }
        }
    }

}
