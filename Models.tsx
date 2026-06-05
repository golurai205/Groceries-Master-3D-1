import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { ItemType } from './items';

// All models occupy roughly a 1.0 unit cube. Origin at base center.

function Apple() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.42, 24, 20]} />
        <meshStandardMaterial color="#ff3b3b" roughness={0.25} metalness={0.05} />
      </mesh>
      {/* highlight */}
      <mesh position={[-0.18, 0.6, 0.25]}>
        <sphereGeometry args={[0.08, 12, 10]} />
        <meshBasicMaterial color="#ffd0c0" transparent opacity={0.7} />
      </mesh>
      {/* stem */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.14, 8]} />
        <meshStandardMaterial color="#6b4226" roughness={0.8} />
      </mesh>
      {/* leaf */}
      <mesh position={[0.1, 0.88, 0]} rotation={[0, 0, -0.6]} castShadow>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshStandardMaterial color="#3eb650" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Banana() {
  const curve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = (t - 0.5) * 0.9;
      const y = 0.35 + Math.sin(t * Math.PI) * 0.25;
      points.push(new THREE.Vector3(x, y, 0));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);
  return (
    <group>
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[curve, 24, 0.13, 12, false]} />
        <meshStandardMaterial color="#ffd93d" roughness={0.35} />
      </mesh>
      {/* tips */}
      <mesh position={[-0.45, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color="#8b6b1f" roughness={0.6} />
      </mesh>
      <mesh position={[0.45, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color="#8b6b1f" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Milk() {
  return (
    <group>
      {/* body */}
      <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      {/* roof */}
      <mesh castShadow position={[0, 0.92, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.0, 0.42, 0.25, 4, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      {/* label */}
      <mesh position={[0, 0.4, 0.305]}>
        <planeGeometry args={[0.45, 0.4]} />
        <meshStandardMaterial color="#4a90e2" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.45, 0.31]}>
        <planeGeometry args={[0.3, 0.12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function Bread() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.32, 0]}>
        <boxGeometry args={[0.85, 0.55, 0.55]} />
        <meshStandardMaterial color="#d4a574" roughness={0.7} />
      </mesh>
      {/* top dome */}
      <mesh castShadow position={[0, 0.6, 0]} scale={[1, 0.5, 0.7]}>
        <sphereGeometry args={[0.42, 16, 12]} />
        <meshStandardMaterial color="#c89060" roughness={0.7} />
      </mesh>
      {/* score marks */}
      {[-0.2, 0, 0.2].map((x, i) => (
        <mesh key={i} position={[x, 0.78, 0]} rotation={[Math.PI / 2, 0, 0.3]}>
          <torusGeometry args={[0.04, 0.015, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Cheese() {
  // wedge using extrude
  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.45, -0.3);
    shape.lineTo(0.45, -0.3);
    shape.lineTo(-0.45, 0.3);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.45, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 });
    g.translate(0, 0.34, -0.22);
    return g;
  }, []);
  return (
    <group>
      <mesh castShadow receiveShadow geometry={geom}>
        <meshStandardMaterial color="#ffc93c" roughness={0.45} />
      </mesh>
      {/* holes */}
      {[
        [-0.1, 0.4, 0.24],
        [0.1, 0.45, 0.24],
        [-0.2, 0.3, 0.24],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color="#e0a820" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Donut() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.16, 16, 32]} />
        <meshStandardMaterial color="#c98a5b" roughness={0.6} />
      </mesh>
      {/* frosting */}
      <mesh castShadow position={[0, 0.27, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.14, 16, 32]} />
        <meshStandardMaterial color="#f08fb9" roughness={0.3} />
      </mesh>
      {/* sprinkles */}
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const r = 0.32 + Math.sin(i) * 0.08;
        const colors = ['#ff5ca8', '#4dd0e1', '#ffeb3b', '#9ccc65', '#ff8a65'];
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, 0.32, Math.sin(a) * r]}
            rotation={[0, a, Math.PI / 4]}
          >
            <boxGeometry args={[0.06, 0.02, 0.02]} />
            <meshStandardMaterial color={colors[i % colors.length]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Juice() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.55, 0.85, 0.4]} />
        <meshStandardMaterial color="#ff8c42" roughness={0.4} />
      </mesh>
      {/* label */}
      <mesh position={[0, 0.5, 0.205]}>
        <planeGeometry args={[0.42, 0.5]} />
        <meshStandardMaterial color="#fff5c1" />
      </mesh>
      {/* straw */}
      <mesh castShadow position={[0.2, 1.0, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* fruit icon */}
      <mesh position={[0, 0.5, 0.21]}>
        <circleGeometry args={[0.12, 16]} />
        <meshStandardMaterial color="#ff6b1a" />
      </mesh>
    </group>
  );
}

function Carrot() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.4, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.22, 0.75, 16]} />
        <meshStandardMaterial color="#ff7f1f" roughness={0.5} />
      </mesh>
      {/* leaves */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.sin(i * 2) * 0.05, 0.88 + i * 0.04, Math.cos(i * 2) * 0.05]} rotation={[0, 0, (i - 1) * 0.4]} castShadow>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial color="#3eb650" roughness={0.5} />
        </mesh>
      ))}
      {/* rings */}
      {[0.25, 0.45, 0.65].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18 - i * 0.04, 0.008, 6, 16]} />
          <meshStandardMaterial color="#d96a10" />
        </mesh>
      ))}
    </group>
  );
}

function EggCarton() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[0.9, 0.3, 0.55]} />
        <meshStandardMaterial color="#c9b89a" roughness={0.85} />
      </mesh>
      {/* eggs */}
      {[-0.27, 0, 0.27].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.4, 0]} scale={[1, 1.25, 1]}>
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshStandardMaterial color="#fff5e1" roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

const MODELS: Record<ItemType, () => React.JSX.Element> = {
  apple: Apple,
  banana: Banana,
  milk: Milk,
  bread: Bread,
  cheese: Cheese,
  donut: Donut,
  juice: Juice,
  carrot: Carrot,
  egg: EggCarton,
};

export function ItemModel({ type }: { type: ItemType }) {
  const C = MODELS[type];
  return <C />;
}
