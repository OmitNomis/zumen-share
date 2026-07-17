import { useRef, useState } from "react";

// Only drags carrying files from outside the page are ours. Dragging something within the
// page (a thumbnail, a card link, selected text) carries text/uri-list & friends instead, and
// must not light up the drop overlay.
const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

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
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current++;
        setIsOver(true);
      },
      onDragOver: (e: React.DragEvent) => {
        if (hasFiles(e)) e.preventDefault();
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current--;
        if (depth.current <= 0) setIsOver(false);
      },
      onDrop: (e: React.DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current = 0;
        setIsOver(false);
        if (e.dataTransfer.files.length) onDrop(e.dataTransfer.files);
      },
    },
  };
}
