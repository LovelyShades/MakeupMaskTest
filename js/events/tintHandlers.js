import { refs } from '../domRefs.js';
import { state } from '../state.js';
import { localStore } from '../helpers.js';
import { renderThree, disposeThree } from '../renderThree.js';

refs.maskTintPicker.addEventListener('input', async (e) => {
    state.maskTint = e.target.value;
    localStore.saveTint(state.maskTint);

    // if we already have a face+mask loaded, re-apply the overlay
    if (state.faceImage && state.maskImage) {
        // clear out any existing 3D
        disposeThree();

        // build payload (same as applyMaskButton.js)
        const W = refs.previewCanvas.width,
            H = refs.previewCanvas.height;
        const payload = {
            keypoints: state.keypoints2D,
            tris: state.triangles,
            uv: state.uvCoords,
            width: W,
            height: H,
            maskFile: state.maskImage,
            bgFile: state.faceImage
        };

        // render with new tint baked in
        renderThree(payload, refs.ctx2);
        renderThree(payload, refs.baCtx2);
    }
});
