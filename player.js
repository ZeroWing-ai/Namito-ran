import * as THREE from 'three';

export class Player {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;

        // Physics
        this.position = new THREE.Vector3(0, 5, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.gravity = -30;
        this.jumpForce = 15;
        this.moveSpeed = 20;
        this.radius = 1;
        this.height = 2; // Camera height offset from "feet"

        this.onGround = false;

        // Input state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
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
            case 'Space':
                if (this.onGround) {
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
            this.velocity.x += v.x * this.moveSpeed * delta * 50; // Acceleration
            this.velocity.z += v.z * this.moveSpeed * delta * 50;
        }
        if (this.moveLeft || this.moveRight) {
            const v = direction.clone().applyEuler(new THREE.Euler(0, this.camera.rotation.y, 0));
            this.velocity.x += v.x * this.moveSpeed * delta * 50;
            this.velocity.z += v.z * this.moveSpeed * delta * 50;
        }

        // Gravity
        this.velocity.y += this.gravity * delta;

        // Apply Position
        this.position.x += this.velocity.x * delta;
        this.position.z += this.velocity.z * delta;
        this.position.y += this.velocity.y * delta;


        // Wall/Map Bounds (Optional: fall off world)
        if (this.position.y < -50) {
            // Reset
            this.position.set(0, 5, 0);
            this.velocity.set(0, 0, 0);
        }

        // Collision Detection
        this.checkCollisions(platforms);

        // Update Camera
        this.camera.position.copy(this.position);

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
            // Player AABB roughly
            playerBox.min.set(center.x - 0.5, center.y - 1.6, center.z - 0.5);
            playerBox.max.set(center.x + 0.5, center.y + 0.4, center.z + 0.5);

            if (box.intersectsBox(playerBox)) {
                // Determine collision side
                // Simple logic: if we are clearly above, it's a landing (if falling)
                // If we are intersecting but not above, it's a wall.

                // Check if we were previously above? Hard without history.
                // Check relative Y.
                // Box Top
                const boxTop = box.max.y;
                const feetY = this.position.y - 1.6;
                const prevFeetY = (this.position.y - 1.6) - (this.velocity.y * 0.016); // Approx prev Frame

                // If feet are near top and we are falling...
                if (feetY >= boxTop - 0.5 && this.velocity.y <= 0) {
                    this.position.y = boxTop + 1.6;
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
