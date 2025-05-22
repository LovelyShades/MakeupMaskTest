// --- faceHandlers.js ---
import { refs } from '../domRefs.js';
import { state } from '../state.js';
import { localStore } from '../helpers.js';
import { drawFaceFromDataURL } from '../faceUtils.js';

// Load face image
refs.faceInput.addEventListener("change", () => {
    const file = refs.faceInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        state.faceImage = reader.result;
        localStore.saveFace(state.faceImage);
        drawFaceFromDataURL(state.faceImage);
    };
    reader.readAsDataURL(file);
});

// Remove face image
refs.removeFaceBtn.addEventListener("click", () => {
    [refs.ctx, refs.ctx2, refs.baCtx, refs.baCtx2].forEach(ct =>
        ct.clearRect(0, 0, ct.canvas.width, ct.canvas.height)
    );
    state.faceImage = null;
    state.keypoints2D = [];
    state.imgDims = {};
    refs.faceInput.value = "";
    refs.faceInput.style.display = "inline-block";
    refs.removeFaceBtn.style.display = "none";
    localStore.clearAllLS();
    state.continueRendering = false;
    refs.threeDiv.innerHTML = "";
});
