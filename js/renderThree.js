// --- js/renderThree.js ---
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { resizeImageToMatch } from './helpers.js';
import { state } from './state.js';

let currentRenderer = null;
let animationId = null;

/**
 * Stops the current render loop and clears out the Three.js canvas,
 * and properly disposes of the WebGL context to avoid leaks.
 */
export function disposeThree() {
    state.continueRendering = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (currentRenderer) {
        currentRenderer.forceContextLoss();
        currentRenderer.dispose();
        currentRenderer = null;
    }
    const container = document.getElementById('three');
    if (container) container.innerHTML = '';
}

export function renderThree({ keypoints, tris, uv, width, height, maskFile, bgFile }, drawCtx) {
    // Tear down any prior renderer/context
    disposeThree();

    // Prepare 2D canvas
    const c = drawCtx.canvas;
    c.width = width;
    c.height = height;
    drawCtx.clearRect(0, 0, width, height);

    // Create WebGL renderer with antialiasing
    currentRenderer = new THREE.WebGLRenderer({
        alpha: true,
        preserveDrawingBuffer: true,
        antialias: true
    });
    currentRenderer.setSize(width, height);
    currentRenderer.setClearColor(0x000000, 0);

    // match 2D-canvas gamma
    currentRenderer.toneMapping = THREE.NoToneMapping;
    currentRenderer.outputColorSpace = THREE.SRGBColorSpace;



    // Scene & camera
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000);
    camera.position.z = 1;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
    keyLight.position.set(0, 1, 1);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight.position.set(0, -1, 1);
    scene.add(fillLight);

    // Background plane
    const bgImg = new Image();
    bgImg.src = bgFile;
    bgImg.onload = () => {
        const tex = new THREE.Texture(bgImg);
        tex.colorSpace = THREE.SRGBColorSpace;  // updated API
        tex.needsUpdate = true;

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ map: tex })
        );
        mesh.position.set(width / 2, height / 2, -1);
        scene.add(mesh);
    };

    // Face geometry
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(keypoints.flat()), 3));
    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(tris.flat()), 1));
    geom.computeVertexNormals();
    geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv.flat()), 2));

    // Makeup mesh
    (async () => {
        const maskImg = new Image();
        maskImg.src = maskFile;
        maskImg.onload = async () => {
            // Resize to match canvas
            const resized = await resizeImageToMatch(maskImg, width, height);

            // Create texture
            const tex2 = new THREE.CanvasTexture(resized);
            tex2.generateMipmaps = true;
            tex2.minFilter = THREE.LinearMipmapLinearFilter;
            tex2.magFilter = THREE.LinearFilter;
            tex2.anisotropy = currentRenderer.capabilities.getMaxAnisotropy();
            tex2.needsUpdate = true;

            // Material with tint + normal blending
            const mat2 = new THREE.MeshPhysicalMaterial({
                map: tex2,
                color: new THREE.Color(state.maskTint),
                transparent: true,
                opacity: state.maskOpacity,
                depthTest: false,
                blending: THREE.NormalBlending,
                side: THREE.DoubleSide,
                roughness: 0.7,
                metalness: 0.0,
                clearcoat: 0.2,
                clearcoatRoughness: 0.5,
                sheen: 0.15,
                sheenColor: new THREE.Color(0xffffff),
            });

            // Mesh setup
            const maskMesh = new THREE.Mesh(geom, mat2);
            maskMesh.renderOrder = 1;
            maskMesh.scale.y = -1;
            maskMesh.position.y = height - maskMesh.position.y;
            const avgZ = keypoints.reduce((sum, p) => sum + p[2], 0) / keypoints.length;
            maskMesh.position.z = avgZ * 0.5;
            scene.add(maskMesh);

            // Optional wireframe
            if (state.showWireframe) {
                const wfMat = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, depthTest: false });
                const wfMesh = new THREE.Mesh(geom, wfMat);
                wfMesh.renderOrder = 2;
                wfMesh.scale.y = -1;
                wfMesh.position.y = height - wfMesh.position.y;
                wfMesh.position.z = maskMesh.position.z + 0.01;
                scene.add(wfMesh);
            }

            // Render loop
            state.continueRendering = true;
            (function animate() {
                if (!state.continueRendering) return;
                animationId = requestAnimationFrame(animate);
                currentRenderer.render(scene, camera);
                drawCtx.clearRect(0, 0, width, height);
                drawCtx.drawImage(currentRenderer.domElement, 0, 0);
            })();
        };
    })();
}
