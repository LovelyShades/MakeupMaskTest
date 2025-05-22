// --- restore.js ---
import { refs } from './domRefs.js';
import { state } from './state.js';
import { localStore } from './helpers.js';
import { drawFaceFromDataURL } from './faceUtils.js';

export function restoreState() {
    const f = localStorage.getItem("faceData");
    if (f) {
        state.faceImage = f;
        drawFaceFromDataURL(f);
    }

    const m = localStorage.getItem("maskData");
    if (m) {
        state.maskImage = m;
        refs.maskInput.style.display = "none";
        refs.removeMaskBtn.style.display = "inline-block";
    }

    const wf = localStorage.getItem("showWireframe");
    if (wf !== null) {
        state.showWireframe = wf === "true";
        refs.meshToggle.checked = state.showWireframe;
    }

    const sv = localStorage.getItem("baSlider");
    if (sv !== null) {
        refs.baSlider.value = sv;
        refs.baAfter.style.clipPath = `inset(0 ${100 - sv}% 0 0)`;
    }

    if (state.faceImage && state.maskImage) {
        refs.goBtn.click();
    }
}
