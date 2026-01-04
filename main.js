
import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // Sky blue background
        document.body.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Bright global light
        this.scene.add(ambientLight);

        // Hemisphere Light for natural global illumination (Sky vs Ground)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);

        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        // Core Components
        this.world = new World(this.scene);
        this.player = new Player(this.camera, this.scene);

        this.clock = new THREE.Clock();

        window.addEventListener('resize', () => this.onWindowResize(), false);
        document.addEventListener('click', () => {
            document.body.classList.add('playing');
            document.body.requestPointerLock();
        });

        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }


    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        this.world.update(this.player.position.z);
        this.player.update(delta, this.world.platforms);

        this.renderer.render(this.scene, this.camera);
    }

}

new Game();
