// --- helpers.js ---
export function resizeImageToMatch(img, w, h) {
    return new Promise(resolve => {
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        c.toBlob(blob => {
            const r = new Image();
            const url = URL.createObjectURL(blob);
            r.onload = () => { URL.revokeObjectURL(url); resolve(r); };
            r.src = url;
        }, "image/png");
    });
}

export const localStore = {
    saveFace: d => localStorage.setItem("faceData", d),
    saveMask: d => localStorage.setItem("maskData", d),
    saveWire: v => localStorage.setItem("showWireframe", v),
    saveSlider: v => localStorage.setItem("baSlider", v),
    saveView: m => localStorage.setItem("viewMode", m),
    clearAllLS: () => ["faceData", "maskData", "showWireframe", "baSlider", "viewMode"]
        .forEach(k => localStorage.removeItem(k))
};