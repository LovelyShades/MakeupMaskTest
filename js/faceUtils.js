// --- faceUtils.js ---
import { refs } from './domRefs.js';
import { state } from './state.js';

export function drawFaceFromDataURL(dataURL) {
    const img = new Image();
    img.src = dataURL;
    img.onload = () => {
        refs.faceInput.style.display = "none";
        refs.removeFaceBtn.style.display = "inline-block";

        const [w0, h0] = [img.naturalWidth, img.naturalHeight];
        state.imgDims.width = w0;
        state.imgDims.height = h0;
        const dispW = refs.previewCanvas.parentElement.clientWidth;
        const dispH = dispW * (h0 / w0);

        [refs.previewCanvas, refs.previewCanvas2, refs.baBefore, refs.baAfter].forEach(c => {
            c.width = dispW;
            c.height = dispH;
            c.style.width = dispW + "px";
            c.style.height = dispH + "px";
        });

        [[refs.previewCanvas, refs.ctx], [refs.baBefore, refs.baCtx]].forEach(([c, ct]) => {
            ct.clearRect(0, 0, c.width, c.height);
            ct.drawImage(img, 0, 0, c.width, c.height);
        });

        // ✅ Guard against uninitialized model
        if (!state.faceMeshModel) {
            console.warn("FaceMesh model not yet loaded.");
            return;
        }

        state.faceMeshModel.detect(refs.previewCanvas, results => {
            if (!results.length) return alert("No face detected on reload.");
            state.keypoints2D = results[0].keypoints.map(p => [p.x, p.y, p.z || 0]);

            refs.ctx.fillStyle = "red";
            refs.ctx.strokeStyle = "lime";
            refs.ctx.lineWidth = 1;

            state.keypoints2D.forEach(([x, y]) => refs.ctx.fillRect(x - 2, y - 2, 4, 4));
            state.triangles.forEach(tri => {
                const [a, b, c2] = tri.map(i => state.keypoints2D[i]);
                refs.ctx.beginPath();
                refs.ctx.moveTo(a[0], a[1]);
                refs.ctx.lineTo(b[0], b[1]);
                refs.ctx.lineTo(c2[0], c2[1]);
                refs.ctx.closePath();
                refs.ctx.stroke();
            });

            const vm = localStorage.getItem("viewMode");
            if (vm === "before") refs.beforeAfterBtn.click();
            else refs.sideBySideBtn.click();

            const sv2 = localStorage.getItem("baSlider");
            const sliderVal = sv2 !== null ? sv2 : refs.baSlider.value;
            refs.baSlider.value = sliderVal;
            refs.baAfter.style.clipPath = `inset(0 ${100 - sliderVal}% 0 0)`;
        });
    };
}
