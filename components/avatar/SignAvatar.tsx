"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function SimpleAvatar() {
    return (
        <group position={[0, -0.2, 0]}>
            {/* Head */}
            <mesh position={[0, 1.1, 0]}>
                <sphereGeometry args={[0.35, 32, 32]} />
                <meshStandardMaterial color="#cbd5e1" /> {/* slate-300 */}
            </mesh>

            {/* Body */}
            <mesh position={[0, 0.4, 0]}>
                <boxGeometry args={[0.7, 1.0, 0.35]} />
                <meshStandardMaterial color="#94a3b8" /> {/* slate-400 */}
            </mesh>

            {/* Arms */}
            <mesh position={[-0.55, 0.55, 0]}>
                <boxGeometry args={[0.35, 0.75, 0.25]} />
                <meshStandardMaterial color="#a1a1aa" /> {/* zinc-400 */}
            </mesh>
            <mesh position={[0.55, 0.55, 0]}>
                <boxGeometry args={[0.35, 0.75, 0.25]} />
                <meshStandardMaterial color="#a1a1aa" />
            </mesh>
        </group>
    );
}

export function SignAvatar() {
    return (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <Canvas camera={{ position: [0, 1.2, 3], fov: 45 }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[3, 5, 2]} intensity={1.2} />
                <SimpleAvatar />
                <OrbitControls enablePan={false} />
            </Canvas>
        </div>
    );
}