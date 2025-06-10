// --- meshToggle.js ---
import { refs } from '../domRefs.js';
import { state } from '../state.js';
import { localStore } from '../helpers.js';

refs.meshToggle.addEventListener("change", () => {
    state.showWireframe = refs.meshToggle.checked;
    state.showDebug = refs.meshToggle.checked; // Add this line
    localStore.saveWire(state.showWireframe);
    if (state.faceImage && state.maskImage) refs.goBtn.click();
});

