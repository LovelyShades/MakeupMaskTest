import { refs } from '../domRefs.js';
import { state } from '../state.js';
import { localStore } from '../helpers.js';
import { renderThree, disposeThree } from '../renderThree.js';

refs.maskOpacityPicker.addEventListener('input', async e => {
    state.maskOpacity = parseFloat(e.target.value);
    localStore.saveOpacity(state.maskOpacity);

    // if we already have face+mask, re-render immediately
    if (state.faceImage && state.maskImage) {
        disposeThree();
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

        renderThree(payload, refs.ctx2);
        renderThree(payload, refs.baCtx2);
    }
});
