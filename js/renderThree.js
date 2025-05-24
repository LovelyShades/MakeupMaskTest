// --- js/renderThree.js ---
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { resizeImageToMatch } from './helpers.js';
import { state } from './state.js';

/**  
 * Stops the current render loop and clears out the Three.js canvas.  
 */
export function disposeThree() {
    state.continueRendering = false;
    const container = document.getElementById('three');
    if (container) container.innerHTML = '';
}

export function renderThree({ keypoints, tris, uv, width, height, maskFile, bgFile }, drawCtx) {
    // 1) Tear down any prior renderer
    disposeThree();

    // 2) Prepare the 2D canvas  
    const c = drawCtx.canvas;
    c.width = width;
    c.height = height;
    drawCtx.clearRect(0, 0, width, height);

    // 3) Create WebGL renderer with antialiasing enabled  
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        preserveDrawingBuffer: true,
        antialias: true
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    // match 2D-canvas gamma
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace; // for r152+

    // 4) Scene & camera  
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000);
    camera.position.z = 1;

    // 5) Lighting  
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
    keyLight.position.set(0, 1, 1);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight.position.set(0, -1, 1);
    scene.add(fillLight);

    // 6) Background plane (sRGB decode)  
    const bgImg = new Image();
    bgImg.src = bgFile;
    bgImg.onload = () => {
        const tex = new THREE.Texture(bgImg);
        tex.encoding = THREE.sRGBEncoding;
        tex.needsUpdate = true;
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ map: tex })
        );
        mesh.position.set(width / 2, height / 2, -1);
        scene.add(mesh);
    };

    // 7) Face geometry  
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(keypoints.flat()), 3));
    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(tris.flat()), 1));
    geom.computeVertexNormals();
    geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv.flat()), 2));

    // 8) Makeup mesh (no blur, with mipmaps & anisotropy)  
    (async () => {
        const maskImg = new Image();
        maskImg.src = maskFile;
        maskImg.onload = async () => {
            // resize
            const resized = await resizeImageToMatch(maskImg, width, height);

            // create CanvasTexture
            const tex2 = new THREE.CanvasTexture(resized);
            tex2.format = THREE.RGBAFormat;
            tex2.flipY = false;
            tex2.generateMipmaps = true;
            tex2.minFilter = THREE.LinearMipmapLinearFilter;
            tex2.magFilter = THREE.LinearFilter;
            tex2.anisotropy = renderer.capabilities.getMaxAnisotropy();
            tex2.needsUpdate = true;

            // material with tint + normal blending
            const mat2 = new THREE.MeshStandardMaterial({
                map: tex2,
                color: new THREE.Color(state.maskTint),
                transparent: true,
                opacity: 0.8,
                alphaTest: 0.01,
                depthTest: false,
                blending: THREE.NormalBlending,
                side: THREE.DoubleSide,
                roughness: 0.7,
                metalness: 0.0
            });

            // setup mesh
            const maskMesh = new THREE.Mesh(geom, mat2);
            maskMesh.renderOrder = 1;
            maskMesh.scale.y = -1;
            maskMesh.position.y = height - maskMesh.position.y;
            const avgZ = keypoints.reduce((sum, p) => sum + p[2], 0) / keypoints.length;
            maskMesh.position.z = avgZ * 0.5;
            scene.add(maskMesh);

            // optional wireframe
            if (state.showWireframe) {
                const wfMat = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, depthTest: false });
                const wfMesh = new THREE.Mesh(geom, wfMat);
                wfMesh.renderOrder = 2;
                wfMesh.scale.y = -1;
                wfMesh.position.y = height - wfMesh.position.y;
                wfMesh.position.z = maskMesh.position.z + 0.01;
                scene.add(wfMesh);
            }

            // 9) Render loop
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
