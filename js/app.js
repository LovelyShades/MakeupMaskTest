// --- app.js ---
import { state } from './state.js';
import { restoreState } from './restore.js';

// wire up all event handlers
import './events/faceHandlers.js';
import './events/maskHandlers.js';
import './events/meshToggle.js';
import './events/slider.js';
import './events/viewMode.js';
import './events/applyMaskButton.js';
import './events/clearAll.js';

window.addEventListener("DOMContentLoaded", async () => {
    // 1. Force TF.js to use WebGL (avoids the WebGPU canvas error)
    if (ml5?.tf?.setBackend) {
        await ml5.tf.setBackend('webgl');
        await ml5.tf.ready();
    }

    // 2. Initialize the FaceMesh model
    if (ml5?.faceMesh) {
        state.faceMeshModel = ml5.faceMesh({ maxFaces: 1 }, () => {
            // once loaded, grab triangles & UVs and restore any saved state
            state.triangles = state.faceMeshModel.getTriangles();
            state.uvCoords = state.faceMeshModel.getUVCoords();
            restoreState();
        });
    } else {
        console.error("ml5.faceMesh is not available.");
    }
});
