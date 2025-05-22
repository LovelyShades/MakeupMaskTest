// --- applyMaskButton.js ---
import { refs } from '../domRefs.js';
import { state } from '../state.js';
import { renderThree } from '../renderThree.js';

refs.goBtn.addEventListener("click", () => {
    if (!state.faceImage || !state.maskImage) return;

    const W = refs.previewCanvas.width;
    const H = refs.previewCanvas.height;

    const doOverlay = () => {
        const data = {
            keypoints: state.keypoints2D,
            tris: state.triangles,
            uv: state.uvCoords,
            width: W,
            height: H,
            maskFile: state.maskImage,
            bgFile: state.faceImage
        };
        renderThree(data, refs.ctx2);
        renderThree(data, refs.baCtx2);
    };

    if (state.keypoints2D.length) {
        doOverlay();
    } else {
        state.faceMeshModel.detect(refs.previewCanvas, res => {
            if (!res.length) return alert("No face detected.");
            state.keypoints2D = res[0].keypoints.map(p => [p.x, p.y, p.z || 0]);
            doOverlay();
        });
    }
});
