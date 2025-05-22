// --- maskHandlers.js ---
import { refs } from '../domRefs.js';
import { state } from '../state.js';
import { localStore } from '../helpers.js';

refs.maskInput.addEventListener("change", () => {
    const file = refs.maskInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        state.maskImage = reader.result;
        localStore.saveMask(state.maskImage);
        refs.maskInput.style.display = "none";
        refs.removeMaskBtn.style.display = "inline-block";
        [refs.ctx2, refs.baCtx2].forEach(ct => ct.clearRect(0, 0, ct.canvas.width, ct.canvas.height));
        refs.goBtn.click();
    };
    reader.readAsDataURL(file);
});

refs.removeMaskBtn.addEventListener("click", () => {
    state.maskImage = null;
    localStorage.removeItem("maskData");
    refs.maskInput.value = "";
    refs.maskInput.style.display = "inline-block";
    refs.removeMaskBtn.style.display = "none";
    [refs.ctx2, refs.baCtx2].forEach(ct => ct.clearRect(0, 0, ct.canvas.width, ct.canvas.height));
    state.continueRendering = false;
    refs.threeDiv.innerHTML = "";
});
