import { useRef, useState } from "react";

// Generic native HTML5 drag-and-drop. Spread dropProps onto any container element.
// Uses an enter/leave counter (not just a boolean) because dragenter/dragleave bubble from
// every child element crossed while dragging, which otherwise flickers isOver on and off.
export function useFileDrop(onDrop: (files: FileList) => void) {
  const [isOver, setIsOver] = useState(false);
  const depth = useRef(0);

  return {
    isOver,
    dropProps: {
      onDragEnter: (e: React.DragEvent) => {
        e.preventDefault();
        depth.current++;
        setIsOver(true);
      },
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDragLeave: (e: React.DragEvent) => {
        e.preventDefault();
        depth.current--;
        if (depth.current <= 0) setIsOver(false);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        depth.current = 0;
        setIsOver(false);
        if (e.dataTransfer.files.length) onDrop(e.dataTransfer.files);
      },
    },
  };
}
