// --- clearAll.js ---
import { refs } from '../domRefs.js';
import { state } from '../state.js';
import { localStore } from '../helpers.js';

refs.clearAllBtn.addEventListener("click", () => {
    // Stop any ongoing Three.js render loop
    state.continueRendering = false;

    // Clear the WebGL canvas container
    refs.threeDiv.innerHTML = "";

    // Reset all 2D canvases to blank size
    [refs.previewCanvas, refs.previewCanvas2, refs.baBefore, refs.baAfter].forEach(c => {
        c.width = c.width;
        c.height = c.height;
    });

    // Trigger the remove handlers to clear images and state
    refs.removeFaceBtn.click();
    refs.removeMaskBtn.click();

    // Reset slider and view
    refs.baSlider.value = 50;
    refs.baAfter.style.clipPath = "inset(0 50% 0 0)";
    refs.sideBySideBtn.click();

    // Clear persisted localStorage
    localStore.clearAllLS();
});
