import { Landmark, RawFrameLandmarks } from "./types";

/**
 * Normalizes raw MediaPipe landmarks into a 506-dimensional feature vector
 * adhering strictly to docs/FEATURE_CONTRACT.md.
 */
export class FeatureNormalizer {
    private previousSpatialFeatures: number[] | null = null;

    /**
     * Resets temporal state (velocity memory) when starting a new stream or clearing session.
     */
    public reset(): void {
        this.previousSpatialFeatures = null;
    }

    /**
     * Formats raw landmarks and spatial features for the POST /validate_features endpoint payload.
     */
    public formatValidationPayload(raw: RawFrameLandmarks, fullFeatures: number[]) {
        const flatten = (pts: Landmark[] | null) => {
            if (!pts) return null;
            const arr: number[] = [];
            for (let i = 0; i < pts.length; i++) {
                arr.push(pts[i].x, pts[i].y, pts[i].z);
            }
            return arr;
        };

        return {
            schema_version: "1.0",
            raw_landmarks: {
                left_hand: flatten(raw.left_hand),
                right_hand: flatten(raw.right_hand),
                face: flatten(raw.face)
            },
            features: fullFeatures.slice(0, 253) // 253 spatial features without temporal velocity
        };
    }

    /**
     * Computes 506-float feature vector from raw frame landmarks.
     */
    public normalizeFrame(raw: RawFrameLandmarks): number[] {
        const spatial = new Array<number>(253).fill(0.0);

        // 1. Extract and normalize Left Hand spatial features (Indices 0-62)
        if (raw.left_hand && raw.left_hand.length === 21) {
            const normalizedLeft = this.normalizeHandLandmarks(raw.left_hand);
            for (let i = 0; i < 63; i++) {
                spatial[i] = normalizedLeft[i];
            }
        }

        // 2. Extract and normalize Right Hand spatial features (Indices 63-125)
        if (raw.right_hand && raw.right_hand.length === 21) {
            const normalizedRight = this.normalizeHandLandmarks(raw.right_hand);
            for (let i = 0; i < 63; i++) {
                spatial[63 + i] = normalizedRight[i];
            }
        }

        // 3. Face-Relative Normalization & Proximity (Indices 126-252)
        let leftNorm = Infinity;
        let rightNorm = Infinity;

        if (raw.face && raw.face.length > 263) {
            const noseTip = raw.face[1];
            const leftEye = raw.face[33];
            const rightEye = raw.face[263];

            if (noseTip && leftEye && rightEye) {
                const faceScale = this.euclideanDistance3D(leftEye, rightEye);
                const safeScale = faceScale > 1e-6 ? faceScale : 1.0;

                // Left Hand Face-Relative (Indices 126-188)
                if (raw.left_hand && raw.left_hand.length === 21) {
                    const relLeft = this.computeFaceRelative(raw.left_hand, noseTip, safeScale);
                    for (let i = 0; i < 63; i++) {
                        spatial[126 + i] = relLeft[i];
                    }
                    // Compute L2 norm of the entire face-relative coordinate vector (63 dimensions)
                    leftNorm = Math.sqrt(relLeft.reduce((sum, val) => sum + val * val, 0));
                }

                // Right Hand Face-Relative (Indices 189-251)
                if (raw.right_hand && raw.right_hand.length === 21) {
                    const relRight = this.computeFaceRelative(raw.right_hand, noseTip, safeScale);
                    for (let i = 0; i < 63; i++) {
                        spatial[189 + i] = relRight[i];
                    }
                    // Compute L2 norm of the entire face-relative coordinate vector (63 dimensions)
                    rightNorm = Math.sqrt(relRight.reduce((sum, val) => sum + val * val, 0));
                }
            }
        }

        // Proximity Feature (Index 252)
        if (leftNorm === Infinity && rightNorm === Infinity) {
            spatial[252] = 1.0; // Default if face or hands missing
        } else {
            spatial[252] = Math.min(leftNorm, rightNorm);
        }

        // Sanitize spatial array against NaN / Infinity
        for (let i = 0; i < 253; i++) {
            if (!Number.isFinite(spatial[i])) {
                spatial[i] = 0.0;
            }
        }

        // 4. Calculate Temporal Velocity (Indices 253-505)
        const velocity = new Array<number>(253).fill(0.0);
        if (this.previousSpatialFeatures !== null) {
            for (let i = 0; i < 253; i++) {
                const diff = spatial[i] - this.previousSpatialFeatures[i];
                velocity[i] = Number.isFinite(diff) ? diff : 0.0;
            }
        }

        // Save current spatial features for next frame velocity calculation
        this.previousSpatialFeatures = [...spatial];

        // Construct 506-float final feature vector
        return [...spatial, ...velocity];
    }

    /**
     * Normalizes a single hand: subtracts wrist (index 0) and scales by maximum Euclidean distance.
     */
    private normalizeHandLandmarks(landmarks: Landmark[]): number[] {
        const wrist = landmarks[0];
        let maxDist = 0.0;

        // Find max distance from wrist to any landmark
        for (let i = 0; i < 21; i++) {
            const dist = this.euclideanDistance3D(landmarks[i], wrist);
            if (dist > maxDist) maxDist = dist;
        }

        const scale = maxDist > 1e-6 ? maxDist : 1.0;
        const result: number[] = [];

        for (let i = 0; i < 21; i++) {
            result.push((landmarks[i].x - wrist.x) / scale);
            result.push((landmarks[i].y - wrist.y) / scale);
            result.push((landmarks[i].z - wrist.z) / scale);
        }

        return result;
    }

    /**
     * Computes face-relative coordinates: subtracts nose center and divides by face scale.
     */
    private computeFaceRelative(landmarks: Landmark[], nose: Landmark, scale: number): number[] {
        const result: number[] = [];
        for (let i = 0; i < 21; i++) {
            result.push((landmarks[i].x - nose.x) / scale);
            result.push((landmarks[i].y - nose.y) / scale);
            result.push((landmarks[i].z - nose.z) / scale);
        }
        return result;
    }

    /**
     * Utility: Calculates 3D Euclidean distance between two landmarks.
     */
    private euclideanDistance3D(p1: Landmark, p2: Landmark): number {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
