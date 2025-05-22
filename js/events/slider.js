// --- slider.js ---
import { refs } from '../domRefs.js';
import { localStore } from '../helpers.js';

refs.baSlider.addEventListener("input", () => {
    const v = refs.baSlider.value;
    refs.baAfter.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
    localStore.saveSlider(v);
});