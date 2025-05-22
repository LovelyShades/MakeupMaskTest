// --- viewMode.js ---
import { refs } from '../domRefs.js';
import { localStore } from '../helpers.js';

refs.sideBySideBtn.addEventListener("click", () => {
    refs.canvasContainer.style.display = "flex";
    refs.beforeAfterWrap.style.display = "none";
    refs.sideBySideBtn.classList.add("active");
    refs.beforeAfterBtn.classList.remove("active");
    localStore.saveView("side");
});

refs.beforeAfterBtn.addEventListener("click", () => {
    refs.canvasContainer.style.display = "none";
    refs.beforeAfterWrap.style.display = "block";
    refs.beforeAfterBtn.classList.add("active");
    refs.sideBySideBtn.classList.remove("active");
    localStore.saveView("before");
});