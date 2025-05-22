// script.js
"use strict";

// State
let faceMeshModel;
let triangles = [];
let uvCoords = [];
let keypoints2D = [];
let imgDims = {};
let faceImage = null;    // Data-URL of face
let maskImage = null;    // Data-URL of mask
let showWireframe = true;
let continueRendering = false;  // controls the Three.js loop

document.addEventListener("DOMContentLoaded", () => {
    // ---- DOM Refs ----
    const faceInput = document.getElementById("faceInput");
    const removeFaceBtn = document.getElementById("removeFaceBtn");
    const maskInput = document.getElementById("maskInput");
    const removeMaskBtn = document.getElementById("removeMaskBtn");
    const meshToggle = document.getElementById("meshToggle");
    const goBtn = document.getElementById("goBtn");
    const clearAllBtn = document.getElementById("clearAllBtn");
    const sideBySideBtn = document.getElementById("sideBySideBtn");
    const beforeAfterBtn = document.getElementById("beforeAfterBtn");
    const canvasContainer = document.querySelector(".canvas_container");
    const beforeAfterWrap = document.querySelector(".before-after_wrapper");
    const previewCanvas = document.getElementById("previewCanvas");
    const previewCanvas2 = document.getElementById("previewCanvas2");
    const baBefore = document.getElementById("baBefore");
    const baAfter = document.getElementById("baAfter");
    const baSlider = document.getElementById("baSlider");
    const threeDiv = document.getElementById("three");

    const ctx = previewCanvas.getContext("2d");
    const ctx2 = previewCanvas2.getContext("2d");
    const baCtx = baBefore.getContext("2d");
    const baCtx2 = baAfter.getContext("2d");

    // ---- Helpers ----
    function resizeImageToMatch(img, w, h) {
        return new Promise(resolve => {
            const c = document.createElement("canvas");
            c.width = w; c.height = h;
            c.getContext("2d").drawImage(img, 0, 0, w, h);
            c.toBlob(blob => {
                const r = new Image();
                const url = URL.createObjectURL(blob);
                r.onload = () => { URL.revokeObjectURL(url); resolve(r); };
                r.src = url;
            }, "image/png");
        });
    }
    const saveFace = d => localStorage.setItem("faceData", d);
    const saveMask = d => localStorage.setItem("maskData", d);
    const saveWire = v => localStorage.setItem("showWireframe", v);
    const saveSlider = v => localStorage.setItem("baSlider", v);
    const saveView = m => localStorage.setItem("viewMode", m);
    const clearAllLS = () => {
        ["faceData", "maskData", "showWireframe", "baSlider", "viewMode"]
            .forEach(k => localStorage.removeItem(k));
    };

    // ---- Restore (without view toggle here) ----
    function restoreState() {
        const f = localStorage.getItem("faceData");
        if (f) { faceImage = f; drawFaceFromDataURL(f); }
        const m = localStorage.getItem("maskData");
        if (m) {
            maskImage = m;
            maskInput.style.display = "none";
            removeMaskBtn.style.display = "inline-block";
        }
        const wf = localStorage.getItem("showWireframe");
        if (wf !== null) {
            showWireframe = wf === "true";
            meshToggle.checked = showWireframe;
        }
        const sv = localStorage.getItem("baSlider");
        if (sv !== null) {
            baSlider.value = sv;
            baAfter.style.clipPath = `inset(0 ${100 - sv}% 0 0)`;
        }
        if (faceImage && maskImage) goBtn.click();
    }

    // ---- Init FaceMesh ----
    if (ml5?.faceMesh) {
        faceMeshModel = ml5.faceMesh({ maxFaces: 1 }, () => {
            triangles = faceMeshModel.getTriangles();
            uvCoords = faceMeshModel.getUVCoords();
            restoreState();
        });
    }

    // ---- Draw Face + Detect ----
    function drawFaceFromDataURL(dataURL) {
        const img = new Image(); img.src = dataURL;
        img.onload = () => {
            faceInput.style.display = "none";
            removeFaceBtn.style.display = "inline-block";

            const [w0, h0] = [img.naturalWidth, img.naturalHeight];
            imgDims = { width: w0, height: h0 };
            const dispW = previewCanvas.parentElement.clientWidth;
            const dispH = dispW * (h0 / w0);

            [previewCanvas, previewCanvas2, baBefore, baAfter].forEach(c => {
                c.width = dispW; c.height = dispH;
                c.style.width = dispW + "px";
                c.style.height = dispH + "px";
            });

            [[previewCanvas, ctx], [baBefore, baCtx]].forEach(([c, ct]) => {
                ct.clearRect(0, 0, c.width, c.height);
                ct.drawImage(img, 0, 0, c.width, c.height);
            });

            faceMeshModel.detect(previewCanvas, results => {
                if (!results.length) return alert("No face detected on reload.");
                keypoints2D = results[0].keypoints.map(p => [p.x, p.y, p.z || 0]);

                ctx.fillStyle = "red"; ctx.strokeStyle = "lime"; ctx.lineWidth = 1;
                keypoints2D.forEach(([x, y]) => ctx.fillRect(x - 2, y - 2, 4, 4));
                triangles.forEach(tri => {
                    const [a, b, c2] = tri.map(i => keypoints2D[i]);
                    ctx.beginPath();
                    ctx.moveTo(a[0], a[1]);
                    ctx.lineTo(b[0], b[1]);
                    ctx.lineTo(c2[0], c2[1]);
                    ctx.closePath();
                    ctx.stroke();
                });

                const vm = localStorage.getItem("viewMode");
                if (vm === "before") beforeAfterBtn.click();
                else sideBySideBtn.click();

                const sv2 = localStorage.getItem("baSlider");
                const sliderVal = sv2 !== null ? sv2 : baSlider.value;
                baSlider.value = sliderVal;
                baAfter.style.clipPath = `inset(0 ${100 - sliderVal}% 0 0)`;
            });
        };
    }

    // ---- Face Upload/Remove ----
    faceInput.addEventListener("change", () => {
        const file = faceInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            faceImage = reader.result;
            saveFace(faceImage);
            drawFaceFromDataURL(faceImage);
        };
        reader.readAsDataURL(file);
    });
    removeFaceBtn.addEventListener("click", () => {
        [ctx, ctx2, baCtx, baCtx2].forEach(ct => ct.clearRect(0, 0, ct.canvas.width, ct.canvas.height));
        faceImage = null; keypoints2D = []; imgDims = {};
        faceInput.value = ""; faceInput.style.display = "inline-block";
        removeFaceBtn.style.display = "none";
        clearAllLS();
        continueRendering = false;
        threeDiv.innerHTML = "";
    });

    // ---- Mask Upload/Remove ----
    maskInput.addEventListener("change", () => {
        const file = maskInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            maskImage = reader.result;
            saveMask(maskImage);
            maskInput.style.display = "none";
            removeMaskBtn.style.display = "inline-block";
            [ctx2, baCtx2].forEach(ct => ct.clearRect(0, 0, ct.canvas.width, ct.canvas.height));
            goBtn.click();  // auto-apply
        };
        reader.readAsDataURL(file);
    });
    removeMaskBtn.addEventListener("click", () => {
        maskImage = null;
        localStorage.removeItem("maskData");
        maskInput.value = "";
        maskInput.style.display = "inline-block";
        removeMaskBtn.style.display = "none";
        [ctx2, baCtx2].forEach(ct => ct.clearRect(0, 0, ct.canvas.width, ct.canvas.height));
        continueRendering = false;
        threeDiv.innerHTML = "";
    });

    // ---- Mesh Toggle ----
    meshToggle.addEventListener("change", () => {
        showWireframe = meshToggle.checked;
        saveWire(showWireframe);
        if (faceImage && maskImage) goBtn.click();
    });

    // ---- Slider ----
    baSlider.addEventListener("input", () => {
        const v = baSlider.value;
        baAfter.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
        saveSlider(v);
    });

    // ---- View Mode Buttons ----
    sideBySideBtn.addEventListener("click", () => {
        canvasContainer.style.display = "flex";
        beforeAfterWrap.style.display = "none";
        sideBySideBtn.classList.add("active");
        beforeAfterBtn.classList.remove("active");
        saveView("side");
    });
    beforeAfterBtn.addEventListener("click", () => {
        canvasContainer.style.display = "none";
        beforeAfterWrap.style.display = "block";
        beforeAfterBtn.classList.add("active");
        sideBySideBtn.classList.remove("active");
        saveView("before");
    });

    // ---- Go Button ----
    goBtn.addEventListener("click", () => {
        if (!faceImage || !maskImage) return;
        const W = previewCanvas.width, H = previewCanvas.height;
        const doOverlay = () => {
            const data = {
                keypoints: keypoints2D, tris: triangles, uv: uvCoords,
                width: W, height: H, maskFile: maskImage, bgFile: faceImage
            };
            renderThree(data, ctx2);
            renderThree(data, baCtx2);
        };
        if (keypoints2D.length) doOverlay();
        else faceMeshModel.detect(previewCanvas, res => {
            if (!res.length) return alert("No face detected.");
            keypoints2D = res[0].keypoints.map(p => [p.x, p.y, p.z || 0]);
            doOverlay();
        });
    });

    // ---- Three.js Render ----
    function renderThree({ keypoints, tris, uv, width, height, maskFile, bgFile }, drawCtx) {
        const c = drawCtx.canvas;
        c.width = width; c.height = height;
        drawCtx.clearRect(0, 0, width, height);

        const renderer = new THREE.WebGLRenderer({ alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        scene.background = null;
        // create camera here
        const camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000);
        camera.position.z = 1;

        // background plane
        const bgImg = new Image(); bgImg.src = bgFile;
        bgImg.onload = () => {
            const tex = new THREE.Texture(bgImg); tex.needsUpdate = true;
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(width, height),
                new THREE.MeshBasicMaterial({ map: tex })
            );
            mesh.position.set(width / 2, height / 2, -1);
            scene.add(mesh);
        };

        // face geometry
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(keypoints.flat()), 3));
        geom.setIndex(new THREE.BufferAttribute(new Uint16Array(tris.flat()), 1));
        geom.computeVertexNormals();
        geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uv.flat()), 2));

        // mask + optional wireframe
        (async () => {
            const maskImg = new Image(); maskImg.src = maskFile;
            maskImg.onload = async () => {
                const resized = await resizeImageToMatch(maskImg, width, height);
                const tex2 = new THREE.CanvasTexture(resized);
                tex2.format = THREE.RGBAFormat; tex2.flipY = false;
                tex2.minFilter = THREE.LinearFilter; tex2.magFilter = THREE.LinearFilter;

                const mat2 = new THREE.MeshBasicMaterial({
                    map: tex2, transparent: true, alphaTest: 0.01,
                    depthTest: false, blending: THREE.NormalBlending, side: THREE.DoubleSide
                });
                const maskMesh = new THREE.Mesh(geom, mat2);
                maskMesh.renderOrder = 1;
                maskMesh.scale.y = -1;
                maskMesh.position.y = height - maskMesh.position.y;
                scene.add(maskMesh);

                if (showWireframe) {
                    const wfMat = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, depthTest: false });
                    const wfMesh = new THREE.Mesh(geom, wfMat);
                    wfMesh.renderOrder = 2;
                    wfMesh.scale.y = -1;
                    wfMesh.position.y = height - wfMesh.position.y;
                    scene.add(wfMesh);
                }

                continueRendering = true;
                (function animate() {
                    if (!continueRendering) return;
                    requestAnimationFrame(animate);
                    renderer.render(scene, camera);
                    drawCtx.clearRect(0, 0, width, height);
                    drawCtx.drawImage(renderer.domElement, 0, 0);
                })();
            };
        })();
    }

    // ---- Clear All ----
    clearAllBtn.addEventListener("click", () => {
        continueRendering = false;
        threeDiv.innerHTML = "";

        [previewCanvas, previewCanvas2, baBefore, baAfter].forEach(c => {
            c.width = c.width;
            c.height = c.height;
        });

        removeFaceBtn.click();
        removeMaskBtn.click();
        baSlider.value = 50;
        baAfter.style.clipPath = "inset(0 50% 0 0)";
        sideBySideBtn.click();
    });

});
