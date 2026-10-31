// features/signatures/components/SignatureCanvas.tsx
//
// Touch-aware signature canvas. Written against the raw HTMLCanvasElement
// so it stays fast on cheap Androids — React re-renders only on
// start/clear, never per-stroke. Pointer events cover mouse, pen, and
// touch on every modern browser including older Android Chrome.

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from "react-i18next";

export interface SignatureCanvasHandle {
  isEmpty(): boolean;
  clear(): void;
  // Returns a data URL (image/png). Null when the canvas is empty.
  toDataUrl(mime?: string, quality?: number): string | null;
}

interface SignatureCanvasProps {
  height?: number;              // CSS px; width always 100% of parent
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  disabled?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  placeholder?: string;
  /** The pad is shown turned 90° clockwise (CSS) so a portrait phone gets a landscape pad. */
  rotated?: boolean;
  /** Hide the built-in Clear button (the caller shows its own). */
  hideClear?: boolean;
}

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  function SignatureCanvas(
    {
      height = 220,
      strokeColor = '#0f172a',
      strokeWidth = 2.5,
      backgroundColor = '#ffffff',
      disabled = false,
      onDirtyChange,
      placeholder,
      rotated = false,
      hideClear = false,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const sizeRef = useRef('');

    // ── Resize observer — keeps the backing store sized to CSS pixels ────
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const sync = () => {
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = parent.clientWidth;
        const cssHeight = height;
        const size = `${cssWidth}x${cssHeight}x${dpr}`;
        if (size === sizeRef.current) return; // same size: keep the drawing
        // Resizing wipes the bitmap, so the pad is empty again; say so, or a
        // blank image would be sent as the signature.
        if (sizeRef.current) {
          setIsDirty(false);
          onDirtyChange?.(false);
        }
        sizeRef.current = size;
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, cssWidth, cssHeight);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
        }
      };

      sync();
      const ro = new ResizeObserver(sync);
      ro.observe(parent);
      return () => ro.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [height, backgroundColor, strokeColor, strokeWidth]);

    const getPoint = (ev: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = ev.currentTarget.getBoundingClientRect();
      // Turned 90° clockwise: the canvas's x runs down the screen and its y runs right-to-left.
      if (rotated) return { x: ev.clientY - rect.top, y: rect.right - ev.clientX };
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    };

    const start = (ev: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      ev.currentTarget.setPointerCapture(ev.pointerId);
      drawingRef.current = true;
      lastPointRef.current = getPoint(ev);
      if (!isDirty) {
        setIsDirty(true);
        onDirtyChange?.(true);
      }
    };

    const move = (ev: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const curr = getPoint(ev);
      const prev = lastPointRef.current || curr;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
      lastPointRef.current = curr;
    };

    const end = () => {
      drawingRef.current = false;
      lastPointRef.current = null;
    };

    const clear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.strokeStyle = strokeColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = strokeWidth;
      setIsDirty(false);
      onDirtyChange?.(false);
    };

    useImperativeHandle(ref, () => ({
      isEmpty: () => !isDirty,
      clear,
      toDataUrl: (mime = 'image/png', quality) => {
        if (!isDirty) return null;
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return quality !== undefined
          ? canvas.toDataURL(mime, quality)
          : canvas.toDataURL(mime);
      },
    }));

    return (
      <Box sx={{ width: '100%' }}>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height,
            borderRadius: 2,
            border: '2px dashed #94a3b8',
            backgroundColor,
            overflow: 'hidden',
            touchAction: 'none', // critical — prevents scroll on touch drag
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onPointerLeave={end}
            style={{ display: 'block', cursor: disabled ? 'not-allowed' : 'crosshair' }}
          />
          {!isDirty && (
            <Typography
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#94a3b8',
                fontSize: 15,
                fontStyle: 'italic',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {placeholder ?? t('signatures.SignatureCanvas.signHere')}
            </Typography>
          )}
        </Box>
        {!hideClear && <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button
            size="small"
            startIcon={<DeleteOutlinedIcon />}
            onClick={clear}
            disabled={disabled || !isDirty}
            sx={{ color: '#64748b', textTransform: 'none' }}
          >
            {t("common.clear")}
          </Button>
        </Box>}
      </Box>
    );
  },
);
