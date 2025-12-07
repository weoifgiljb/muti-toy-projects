import React, { useEffect, useRef, useState } from 'react';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { useStore } from '../store';

const HandTracker: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [model, setModel] = useState<handPoseDetection.HandDetector | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const setFormationProgress = useStore((state) => state.setFormationProgress);
  const setHandPosition = useStore((state) => state.setHandPosition);
  const setHandDetected = useStore((state) => state.setHandDetected);

  // Initialize Camera & Model
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // 1. Check & Init Camera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("Camera API not supported");
        setCameraError(true);
        return;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
      } catch (e) {
        console.warn("Camera access denied or missing", e);
        setCameraError(true);
        return; 
      }

      if (!isMounted || !videoRef.current || !stream) return;
      
      videoRef.current.srcObject = stream;
      
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
                videoRef.current!.play();
                resolve();
            };
        }
      });

      // 2. Init Model (Only if camera works)
      try {
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig: handPoseDetection.MediaPipeHandsMediaPipeModelConfig = {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
          modelType: 'full',
        };
        const detector = await handPoseDetection.createDetector(model, detectorConfig);
        if (isMounted) setModel(detector);
      } catch (e) {
         console.error("Failed to load HandPose model", e);
      }
    };

    init();

    return () => {
      isMounted = false;
      // Cleanup stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Detection Loop
  useEffect(() => {
    if (!model || !videoRef.current || cameraError) return;

    let rafId: number;
    const video = videoRef.current;

    const detect = async () => {
      if (video.readyState < 2) {
        rafId = requestAnimationFrame(detect);
        return;
      }

      try {
        const hands = await model.estimateHands(video);

        if (hands.length > 0) {
          setHandDetected(true);
          const hand = hands[0];
          
          const wrist = hand.keypoints[0];
          const fingertips = [4, 8, 12, 16, 20].map(i => hand.keypoints[i]);
          
          // Calculate average spread
          let totalDist = 0;
          fingertips.forEach(tip => {
            totalDist += Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
          });
          const avgDist = totalDist / 5;

          // Mapping: Large Dist (>120ish) -> Chaos (0). Small Dist (<50) -> Formed (1).
          // Normalized range estimation
          const val = Math.max(0, Math.min(1, (avgDist - 50) / 100));
          // val is 0(closed) to 1(open). 
          // We want Open=Chaos(0), Closed=Formed(1).
          const progress = 1 - val; 
          
          setFormationProgress(progress);

          // Camera Control: Center is (0,0)
          const x = (wrist.x / video.videoWidth) * 2 - 1;
          const y = -(wrist.y / video.videoHeight) * 2 + 1;
          setHandPosition(x, y);

        } else {
          setHandDetected(false);
          // Auto-reform if no hand
          setFormationProgress(1.0);
        }
      } catch (e) {
        // console.error(e);
      }
      
      rafId = requestAnimationFrame(detect);
    };

    detect();
    return () => cancelAnimationFrame(rafId);
  }, [model, cameraError, setFormationProgress, setHandPosition, setHandDetected]);

  if (cameraError) return null; // Invisible if error

  return (
    <div className="fixed top-4 left-4 z-50 pointer-events-none group">
      <div className="relative border-4 border-trump-gold rounded-lg overflow-hidden shadow-[0_0_20px_#FFD700] transition-opacity duration-300 opacity-50 group-hover:opacity-100">
        <video
            ref={videoRef}
            playsInline
            muted
            className="w-48 h-36 object-cover transform -scale-x-100 bg-black"
        />
        <div className="absolute bottom-0 w-full bg-black/70 text-trump-gold text-[10px] text-center font-serif tracking-widest py-1">
          SECURE FEED // HAND_OS
        </div>
      </div>
    </div>
  );
};

export default HandTracker;



