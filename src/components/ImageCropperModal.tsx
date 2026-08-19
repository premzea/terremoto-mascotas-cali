"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Crop, ZoomIn, ZoomOut, RotateCw, Check, X, Move, Sparkles } from "lucide-react";

interface ImageCropperModalProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageCropperModal({
  imageSrc,
  onCropComplete,
  onCancel,
}: ImageCropperModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Handle image load to calculate natural dimensions and base display size
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
  };

  // Mouse & Touch Dragging for Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers for Mobile Devices
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      touchStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = {
        x: pan.x,
        y: pan.y,
        dist,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      // Pinch to zoom move
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartRef.current.dist;
      setZoom((prev) => Math.min(3.5, Math.max(0.5, prev * (factor > 1 ? 1.03 : 0.97))));
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current.dist = undefined;
  };

  // Rotate 90 deg clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Calculate base rendered dimensions inside a square box
  const getBaseDimensions = (boxW: number, boxH: number, natW: number, natH: number) => {
    if (!natW || !natH) return { width: boxW, height: boxH };
    const aspect = natW / natH;
    if (aspect >= 1) {
      // Landscape or square: fit to width
      return { width: boxW, height: boxW / aspect };
    } else {
      // Portrait: fit to height
      return { width: boxH * aspect, height: boxH };
    }
  };

  // Perform Final Crop on Canvas
  const handleCropConfirm = () => {
    if (!imageRef.current || !containerRef.current || !naturalSize.width || !naturalSize.height) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const cropBox = container.getBoundingClientRect();
    const boxSize = Math.min(cropBox.width, cropBox.height);

    // Create high-res square canvas (800x800 for optimal AI vision & UI cards)
    const canvas = document.createElement("canvas");
    const cropSize = 800;
    canvas.width = cropSize;
    canvas.height = cropSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Fill background with clean neutral tone
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(0, 0, cropSize, cropSize);

    // Scale factor from screen CSS pixels to canvas pixels
    const canvasScale = cropSize / boxSize;

    // Calculate base dimensions on canvas
    const baseScreen = getBaseDimensions(boxSize, boxSize, naturalSize.width, naturalSize.height);
    const canvasBaseW = baseScreen.width * canvasScale;
    const canvasBaseH = baseScreen.height * canvasScale;

    // Apply exact CSS transformation matrix:
    // 1. Move to canvas center + pan offset (scaled to canvas)
    ctx.save();
    ctx.translate(
      cropSize / 2 + pan.x * canvasScale,
      cropSize / 2 + pan.y * canvasScale
    );

    // 2. Rotate around the centered origin
    ctx.rotate((rotation * Math.PI) / 180);

    // 3. Scale around the centered origin
    ctx.scale(zoom, zoom);

    // 4. Draw image centered at (0, 0)
    ctx.drawImage(
      img,
      -canvasBaseW / 2,
      -canvasBaseH / 2,
      canvasBaseW,
      canvasBaseH
    );
    ctx.restore();

    // Export high-quality JPEG
    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob, croppedDataUrl);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-[80] flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 w-full max-w-lg rounded-3xl overflow-hidden flex flex-col text-white shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Crop className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-stone-100 flex items-center gap-1.5">
                Encuadrar y Recortar Foto
              </h3>
              <p className="text-[11px] text-stone-400">
                Ajusta y centra la mascota para un mejor reconocimiento
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Crop Area */}
        <div className="relative w-full h-80 sm:h-96 bg-stone-950 flex items-center justify-center overflow-hidden select-none touch-none">
          {/* Crop Boundary Box Guide */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-amber-400 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] z-10 flex items-center justify-center bg-stone-900"
          >
            {/* Grid Overlay Lines (Rule of thirds) */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-20">
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div></div>
            </div>

            {/* Corner Indicators */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400 pointer-events-none z-20 rounded-tl-sm"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400 pointer-events-none z-20 rounded-tr-sm"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400 pointer-events-none z-20 rounded-bl-sm"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400 pointer-events-none z-20 rounded-br-sm"></div>

            {/* Hint overlay */}
            <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none z-20">
              <span className="text-[10px] bg-black/70 text-stone-200 px-2.5 py-0.5 rounded-full border border-white/10 font-medium">
                Arrastra para encuadrar • Usa la barra para zoom
              </span>
            </div>

            {/* Target Image with Transformations */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.08s ease-out",
              }}
              className="pointer-events-none select-none flex-shrink-0"
            />
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 bg-stone-900 border-t border-stone-800 space-y-4">
          {/* Zoom Slider & Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-amber-500 bg-stone-800 h-2 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRotate}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-xl transition flex items-center gap-1 text-xs font-bold px-3 border border-stone-700"
              title="Girar 90 grados"
            >
              <RotateCw className="w-4 h-4" />
              <span className="hidden sm:inline">Girar</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="py-3 px-4 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-2xl text-stone-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Usar Original</span>
            </button>

            <button
              type="button"
              onClick={handleCropConfirm}
              className="py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-amber-500/25 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Confirmar Recorte</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
