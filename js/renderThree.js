// --- renderThree.js ---
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { resizeImageToMatch } from './helpers.js';
import { state } from './state.js';

export function renderThree({ keypoints, tris, uv, width, height, maskFile, bgFile }, drawCtx) {
    // prepare 2D canvas
    const c = drawCtx.canvas;
    c.width = width;
    c.height = height;
    drawCtx.clearRect(0, 0, width, height);

    // Create WebGL renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputEncoding = THREE.LinearEncoding;
    renderer.toneMappingExposure = 1;

    // Scene & camera
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000);
    camera.position.z = 1;

    // ─── LIGHTING ─────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));              // soft fill
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);    // main highlight
    keyLight.position.set(0, 1, 1);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);   // subtle shadow fill
    fillLight.position.set(0, -1, 1);
    scene.add(fillLight);

    // ─── BACKGROUND PLANE ──────────────────────────────────
    const bgImg = new Image();
    bgImg.src = bgFile;
    bgImg.onload = () => {
        const tex = new THREE.Texture(bgImg);
        tex.needsUpdate = true;
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ map: tex })
        );
        mesh.position.set(width / 2, height / 2, -1);
        scene.add(mesh);
    };

    // ─── FACE GEOMETRY ────────────────────────────────────
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(keypoints.flat()), 3));
    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(tris.flat()), 1));
    geom.computeVertexNormals();
    geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv.flat()), 2));

    // ─── MAKEUP MESH ─────────────────────────────────────
    (async () => {
        const maskImg = new Image();
        maskImg.src = maskFile;
        maskImg.onload = async () => {
            const resized = await resizeImageToMatch(maskImg, width, height);
            const tex2 = new THREE.CanvasTexture(resized);
            tex2.format = THREE.RGBAFormat;
            tex2.flipY = false;
            tex2.minFilter = THREE.LinearFilter;
            tex2.magFilter = THREE.LinearFilter;

            // Use a lit, PBR material
            const mat2 = new THREE.MeshStandardMaterial({
                map: tex2,
                transparent: true,
                alphaTest: 0.01,
                depthTest: false,
                blending: THREE.MultiplyBlending,  // darken shadows; try AdditiveBlending for highlights
                side: THREE.DoubleSide,
                roughness: 0.7,
                metalness: 0.0
            });

            const maskMesh = new THREE.Mesh(geom, mat2);
            maskMesh.renderOrder = 1;

            // flip vertically to match canvas coords
            maskMesh.scale.y = -1;
            maskMesh.position.y = height - maskMesh.position.y;

            // ── DEPTH OFFSET ── use average z to push mesh onto face surface
            const avgZ = keypoints.reduce((sum, p) => sum + p[2], 0) / keypoints.length;
            maskMesh.position.z = avgZ * 0.5;

            scene.add(maskMesh);

            // ─── OPTIONAL: wireframe overlay ─────────────────
            if (state.showWireframe) {
                const wfMat = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, depthTest: false });
                const wfMesh = new THREE.Mesh(geom, wfMat);
                wfMesh.renderOrder = 2;
                wfMesh.scale.y = -1;
                wfMesh.position.y = height - wfMesh.position.y;
                wfMesh.position.z = maskMesh.position.z + 0.01;
                scene.add(wfMesh);
            }

            // ─── RENDER LOOP ────────────────────────────────
            state.continueRendering = true;
            (function animate() {
                if (!state.continueRendering) return;
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
                drawCtx.clearRect(0, 0, width, height);
                drawCtx.drawImage(renderer.domElement, 0, 0);
            })();
        };
    })();
}
