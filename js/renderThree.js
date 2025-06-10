import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { resizeImageToMatch } from './helpers.js';
import { state } from './state.js';

let currentRenderer = null;
let animationId = null;
let prevXLight = 0;
let prevYLight = 0;
let bgCanvas = null;
let bgCtx = null;

export function disposeThree() {
    state.continueRendering = false;
    if (animationId) cancelAnimationFrame(animationId);
    if (currentRenderer) {
        currentRenderer.forceContextLoss();
        currentRenderer.dispose();
        currentRenderer = null;
    }
    const container = document.getElementById('three');
    if (container) container.innerHTML = '';
}
function sampleBrightness(drawCtx, x, y) {
    const pixel = drawCtx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    const brightness = (pixel[0] + pixel[1] + pixel[2]) / (3 * 255); // normalized 0..1
    return brightness;
}
const bgIsFlippedY = false; // set this to true if you ever flip bgCtx

function estimateLightDirection(drawCtx, keypoints, width, height) {
    // MediaPipe FaceMesh keypoints
    const foreheadPos = keypoints[10];
    const leftCheekPos = keypoints[234];
    const rightCheekPos = keypoints[454];
    const chinPos = keypoints[152];
    const nosePos = keypoints[6];

    // Convert to 2D canvas coordinates (flip Y)
    const foreheadX = foreheadPos[0];
    const foreheadY = bgIsFlippedY ? (height - foreheadPos[1]) : foreheadPos[1];
    const leftCheekX = leftCheekPos[0];
    const leftCheekY = bgIsFlippedY ? (height - leftCheekPos[1]) : leftCheekPos[1];
    const rightCheekX = rightCheekPos[0];
    const rightCheekY = bgIsFlippedY ? (height - rightCheekPos[1]) : rightCheekPos[1];
    const chinX = chinPos[0];
    const chinY = bgIsFlippedY ? (height - chinPos[1]) : chinPos[1];
    const noseX = nosePos[0];
    const noseY = bgIsFlippedY ? (height - nosePos[1]) : nosePos[1];

    // Sample brightness at points
    const forehead = sampleBrightness(drawCtx, foreheadX, foreheadY);
    const leftCheek = sampleBrightness(drawCtx, leftCheekX, leftCheekY);
    const rightCheek = sampleBrightness(drawCtx, rightCheekX, rightCheekY);
    const chin = sampleBrightness(drawCtx, chinX, chinY);
    const nose = sampleBrightness(drawCtx, noseX, noseY);

    // Estimate light direction
    let xLight = rightCheek - leftCheek;
    let yLight = forehead - chin;

    // Clamp to reasonable range
    const clamp = 1.0;
    xLight = Math.max(-clamp, Math.min(clamp, xLight));
    yLight = Math.max(-clamp, Math.min(clamp, yLight));

    // Return also the point positions used — for debug dots
    const debugPoints = [
        [foreheadX, foreheadY],
        [leftCheekX, leftCheekY],
        [rightCheekX, rightCheekY],
        [chinX, chinY],
        [noseX, noseY],
    ];

    return { xLight, yLight, debugPoints };
}

export function renderThree({ keypoints, tris, uv, width, height, maskFile, bgFile }, drawCtx) {
    disposeThree();

    // prepare 2D canvas
    const c = drawCtx.canvas;
    c.width = width;
    c.height = height;
    drawCtx.clearRect(0, 0, width, height);

    // create renderer
    currentRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    currentRenderer.setSize(width, height);
    currentRenderer.setClearColor(0x000000, 0);
    currentRenderer.toneMapping = THREE.NoToneMapping;
    currentRenderer.outputColorSpace = THREE.SRGBColorSpace;
    currentRenderer.shadowMap.enabled = true;
    currentRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // scene
    const scene = new THREE.Scene();

    // OrthographicCamera — keeps face aligned to background photo
    const camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000);
    camera.position.z = 1;

    // background image
    const bgImg = new Image();
    bgImg.src = bgFile;
    bgImg.crossOrigin = 'anonymous';
    bgImg.onload = () => {
        const tex = new THREE.Texture(bgImg);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        scene.background = tex;
        // Create offscreen canvas for light estimation
        bgCanvas = document.createElement('canvas');
        bgCanvas.width = width;
        bgCanvas.height = height;
        bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });
        bgCtx.drawImage(bgImg, 0, 0, width, height);
    };

    // Best realistic face filter lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(0.5, 1, 1);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight.position.set(-0.5, -0.8, 1);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.05);
    rimLight.position.set(0, -0.5, -1);
    scene.add(rimLight);

    // face mesh geometry
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(keypoints.flat()), 3));
    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(tris.flat()), 1));
    geom.computeVertexNormals();
    geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv.flat()), 2));
    // UV2 needed for aoMap
    geom.setAttribute('uv2', new THREE.BufferAttribute(new Float32Array(uv.flat()), 2));

    // load mask
    (async () => {
        const maskImg = new Image();
        maskImg.src = maskFile;
        maskImg.crossOrigin = 'anonymous';
        maskImg.onload = async () => {
            const resized = await resizeImageToMatch(maskImg, width, height);

            const tex2 = new THREE.CanvasTexture(resized);
            tex2.generateMipmaps = true;
            tex2.minFilter = THREE.LinearMipmapLinearFilter;
            tex2.magFilter = THREE.LinearFilter;
            tex2.anisotropy = currentRenderer.capabilities.getMaxAnisotropy();
            tex2.flipY = false;
            tex2.needsUpdate = true;

            // OPTIONAL: load AO map (if you have one)
            const aoTexture = new THREE.TextureLoader().load(
                './aoMap.png',
                texture => {
                    texture.flipY = false;
                    texture.colorSpace = THREE.LinearSRGBColorSpace;
                    texture.needsUpdate = true; // <- always add this!
                    console.log('AO map loaded.');
                },
                undefined,
                err => {
                    console.log('No AO map found or failed to load — continuing without AO.');
                }
            );

            const mat2 = new THREE.MeshStandardMaterial({
                map: tex2,
                color: new THREE.Color(state.maskTint),
                transparent: true,
                opacity: state.maskOpacity,
                alphaTest: 0.01,
                blending: THREE.NormalBlending,
                side: THREE.DoubleSide,
                roughness: 0.6,
                metalness: 0.0,
                premultipliedAlpha: true,
                aoMap: aoTexture,
                aoMapIntensity: 1.0,
            });


            const maskMesh = new THREE.Mesh(geom, mat2);
            maskMesh.renderOrder = 1;
            maskMesh.scale.y = -1;
            maskMesh.position.y = height - maskMesh.position.y;
            const avgZ = keypoints.reduce((sum, p) => sum + p[2], 0) / keypoints.length;
            maskMesh.position.z = avgZ * 0.5;
            scene.add(maskMesh);

            maskMesh.castShadow = false;
            maskMesh.receiveShadow = false;

            // optional wireframe
            if (state.showWireframe) {
                const wfMat = new THREE.MeshBasicMaterial({
                    wireframe: true,
                    transparent: true,
                    depthTest: false
                });
                const wfMesh = new THREE.Mesh(geom, wfMat);
                wfMesh.renderOrder = 2;
                wfMesh.scale.y = -1;
                wfMesh.position.y = height - wfMesh.position.y;
                wfMesh.position.z = maskMesh.position.z + 0.01;
                scene.add(wfMesh);

            }

            // render loop
            state.continueRendering = true;
            (function animate() {
                if (!state.continueRendering) return;
                animationId = requestAnimationFrame(animate);

                // Render 3D scene to transparent WebGL canvas
                currentRenderer.render(scene, camera);

                // Estimate light direction and update key light
                const { xLight, yLight, debugPoints } = estimateLightDirection(bgCtx, keypoints, width, height);


                // Smooth light direction over time
                const smoothFactor = 0.1;

                // Invert xLight to match 3D space vs 2D image
                const targetX = -xLight * 2;
                const targetY = yLight * 2;

                // Apply smoothing
                prevXLight += (targetX - prevXLight) * smoothFactor;
                prevYLight += (targetY - prevYLight) * smoothFactor;

                // Update keyLight position
                keyLight.position.x = prevXLight;
                keyLight.position.y = prevYLight;
                keyLight.position.z = 1;
                keyLight.position.normalize();

                // Composite final image
                drawCtx.clearRect(0, 0, width, height);
                if (bgImg.complete) {
                    drawCtx.drawImage(bgImg, 0, 0, width, height);
                }
                drawCtx.drawImage(currentRenderer.domElement, 0, 0);

                // Debug: draw smoothed light arrow (prevXLight / prevYLight)
                if (state.showDebug) {
                    drawCtx.save();
                    drawCtx.strokeStyle = 'rgba(255,0,0,0.8)';
                    drawCtx.lineWidth = 2;
                    drawCtx.beginPath();
                    drawCtx.moveTo(width / 2, height / 2);
                    drawCtx.lineTo(width / 2 + prevXLight * 50, height / 2 - prevYLight * 50);
                    drawCtx.stroke();
                    drawCtx.restore();
                }
                if (state.showDebug) { // Debug: draw light estimation points (yellow dots)
                    drawCtx.save();
                    drawCtx.fillStyle = 'rgba(255, 255, 0, 0.9)'; // yellow dots
                    drawCtx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
                    drawCtx.lineWidth = 1;

                    debugPoints.forEach(point => {
                        const x = point[0];
                        const y = point[1];
                        drawCtx.beginPath();
                        drawCtx.arc(x, y, 3, 0, 2 * Math.PI); // slightly bigger dot
                        drawCtx.fill();
                        drawCtx.stroke();
                    });

                    drawCtx.restore();
                }
            })();

        };
    })();
}
