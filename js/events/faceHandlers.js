// --- js/events/faceHandlers.js ---
import { refs } from '../domRefs.js';
import { state } from '../state.js';
import { localStore } from '../helpers.js';
import { drawFaceFromDataURL } from '../faceUtils.js';

// Load face image
refs.faceInput.addEventListener('change', () => {
    const file = refs.faceInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        state.faceImage = reader.result;
        localStore.saveFace(state.faceImage);
        // draw onto 2D canvases
        drawFaceFromDataURL(state.faceImage);

        // update UI
        refs.removeFaceBtn.style.display = 'inline-block';
        refs.faceInput.style.display = 'none';
    };
    reader.readAsDataURL(file);
});

// Remove face image only (keep mask intact)
refs.removeFaceBtn.addEventListener('click', () => {
    // 1) Clear all 2D canvases
    [refs.ctx, refs.ctx2, refs.baCtx, refs.baCtx2].forEach(ct =>
        ct.clearRect(0, 0, ct.canvas.width, ct.canvas.height)
    );

    // 2) Reset face-related state & storage
    state.faceImage = null;
    state.keypoints2D = [];
    state.imgDims = {};
    state.continueRendering = false;
    localStorage.removeItem('faceData');

    // 3) Tear down the 3D scene
    refs.threeDiv.innerHTML = '';

    // 4) Reset face input & button
    refs.faceInput.value = '';
    refs.faceInput.style.display = 'inline-block';
    refs.removeFaceBtn.style.display = 'none';

    window.location.reload();
});
