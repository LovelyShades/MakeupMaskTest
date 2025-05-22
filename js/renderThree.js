import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { resizeImageToMatch } from './helpers.js';
import { state } from './state.js';

export function renderThree({ keypoints, tris, uv, width, height, maskFile, bgFile }, drawCtx) {
    const c = drawCtx.canvas;
    c.width = width;
    c.height = height;
    drawCtx.clearRect(0, 0, width, height);

    const renderer = new THREE.WebGLRenderer({ alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.background = null;
    const camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000);
    camera.position.z = 1;

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

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(keypoints.flat()), 3));
    geom.setIndex(new THREE.BufferAttribute(new Uint16Array(tris.flat()), 1));
    geom.computeVertexNormals();
    geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uv.flat()), 2));

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

            const mat2 = new THREE.MeshBasicMaterial({
                map: tex2,
                transparent: true,
                alphaTest: 0.01,
                depthTest: false,
                blending: THREE.NormalBlending,
                side: THREE.DoubleSide
            });
            const maskMesh = new THREE.Mesh(geom, mat2);
            maskMesh.renderOrder = 1;
            maskMesh.scale.y = -1;
            maskMesh.position.y = height - maskMesh.position.y;
            scene.add(maskMesh);

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
                scene.add(wfMesh);
            }

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
