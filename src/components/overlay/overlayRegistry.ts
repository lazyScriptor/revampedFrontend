import type { ComponentType } from "react";

/** Props every registered overlay component receives, besides its own. */
export interface OverlayComponentProps {
  /** Closes this overlay (and nothing below it). */
  onClose: () => void;
}

const registry = new Map<string, ComponentType<any>>();

/** Makes an overlay openable by id: `useOverlay().open(id, props)`. Safe to call at module load. */
export function registerOverlay<P extends object>(id: string, component: ComponentType<P & OverlayComponentProps>) {
  registry.set(id, component as ComponentType<any>);
}

export const getOverlayComponent = (id: string) => registry.get(id);
