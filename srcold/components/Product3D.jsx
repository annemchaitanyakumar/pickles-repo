import { useRef } from 'react';
import PropTypes from 'prop-types';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box } from '@react-three/drei';

const RotatingJar = ({ productName, color = '#ff6b35' }) => {
  const meshRef = useRef(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group>
      {/* Jar Base */}
      <mesh ref={meshRef} position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.8, 0.9, 1.5, 32]} />
        <meshPhongMaterial color={color} transparent opacity={0.8} />
      </mesh>
      
      {/* Jar Lid */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.2, 32]} />
        <meshPhongMaterial color="#8B4513" />
      </mesh>
      
      {/* Label */}
      <Text
        position={[0, 0, 0.85]}
        fontSize={0.15}
        color="#000"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.5}
      >
        {productName}
      </Text>
    </group>
  );
};

export const Product3D = ({ productName, color }) => {
  return (
    <div className="w-full h-64 bg-gradient-to-b from-muted/50 to-background rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, 5, 5]} intensity={0.5} />
        
        <RotatingJar productName={productName} color={color} />
        
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={2}
          maxDistance={6}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
};

RotatingJar.propTypes = {
  productName: PropTypes.string.isRequired,
  color: PropTypes.string
};

Product3D.propTypes = {
  productName: PropTypes.string.isRequired,
  color: PropTypes.string
};