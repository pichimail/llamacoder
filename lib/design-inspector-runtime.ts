export const DESIGN_INSPECTOR_RUNTIME_PATH = '/lib/design-inspector-runtime.tsx'

export const DESIGN_INSPECTOR_RUNTIME_SOURCE = `import * as React from 'react';

const SOURCE = 'llamacoder-inspector';

type Rect = { top: number; left: number; width: number; height: number };

function toRect(element: Element): Rect {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function post(type: string, payload: Record<string, unknown>) {
  const message = { source: SOURCE, type, ...payload };
  try {
    window.parent?.postMessage(message, '*');
  } catch {}
  try {
    window.top?.postMessage(message, '*');
  } catch {}
}

function findInspectable(target: EventTarget | null) {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.documentElement) {
    if (node instanceof HTMLElement && node.dataset.llamaId) return node;
    node = node.parentElement;
  }
  return null;
}

function Overlay({
  rect,
  tone,
  label,
}: {
  rect: Rect;
  tone: 'hover' | 'select';
  label?: string;
}) {
  const color = tone === 'hover' ? 'rgba(59,130,246,0.85)' : 'rgba(16,185,129,0.95)';
  const fill = tone === 'hover' ? 'rgba(59,130,246,0.08)' : 'rgba(16,185,129,0.1)';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          border: \`2px solid \${color}\`,
          background: fill,
          borderRadius: 4,
          pointerEvents: 'none',
          zIndex: 2147483646,
          boxSizing: 'border-box',
          transition: 'all 80ms ease-out',
        }}
      />
      {label ? (
        <div
          style={{
            position: 'fixed',
            top: Math.max(4, rect.top - 24),
            left: rect.left,
            background: tone === 'hover' ? '#2563eb' : '#059669',
            color: '#fff',
            fontSize: 11,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            lineHeight: '18px',
            padding: '0 6px',
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 2147483647,
            whiteSpace: 'nowrap',
            maxWidth: 280,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </div>
      ) : null}
    </>
  );
}

export function InspectorProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = React.useState(true);
  const [hoverRect, setHoverRect] = React.useState<Rect | null>(null);
  const [hoverLabel, setHoverLabel] = React.useState('');
  const [selectRect, setSelectRect] = React.useState<Rect | null>(null);
  const [selectLabel, setSelectLabel] = React.useState('');
  const selectedRef = React.useRef<string | null>(null);

  const highlightById = React.useCallback((id: string | null | undefined) => {
    if (!id) {
      setSelectRect(null);
      setSelectLabel('');
      selectedRef.current = null;
      return;
    }
    const node = document.querySelector(\`[data-llama-id="\${id}"]\`);
    if (!(node instanceof HTMLElement)) return;
    selectedRef.current = id;
    setSelectRect(toRect(node));
    setSelectLabel(node.tagName.toLowerCase());
  }, []);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.source !== SOURCE) return;
      if (event.data.type === 'set-enabled') {
        setEnabled(Boolean(event.data.enabled));
        if (!event.data.enabled) {
          setHoverRect(null);
          setSelectRect(null);
        }
      }
      if (event.data.type === 'highlight') highlightById(event.data.id);
      if (event.data.type === 'clear-highlight') highlightById(null);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [highlightById]);

  React.useEffect(() => {
    if (!enabled) return;

    const onMouseMove = (event: MouseEvent) => {
      const element = findInspectable(event.target);
      if (!element) {
        setHoverRect(null);
        setHoverLabel('');
        post('hover', { id: null, rect: null });
        return;
      }

      const rect = toRect(element);
      const id = element.dataset.llamaId || '';
      const label = element.tagName.toLowerCase();
      setHoverRect(rect);
      setHoverLabel(label);
      post('hover', { id, tag: label, rect });
    };

    const onClick = (event: MouseEvent) => {
      const element = findInspectable(event.target);
      if (!element) return;
      event.preventDefault();
      event.stopPropagation();

      const rect = toRect(element);
      const id = element.dataset.llamaId || '';
      const className = typeof element.className === 'string' ? element.className : '';
      const text = (element.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 140);

      selectedRef.current = id;
      setSelectRect(rect);
      setSelectLabel(element.tagName.toLowerCase());
      post('select', { id, tag: element.tagName.toLowerCase(), className, text, rect });
    };

    const onScroll = () => {
      if (selectedRef.current) highlightById(selectedRef.current);
    };

    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    return () => {
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [enabled, highlightById]);

  return (
    <>
      {children}
      {enabled && hoverRect ? <Overlay rect={hoverRect} tone="hover" label={hoverLabel} /> : null}
      {enabled && selectRect ? <Overlay rect={selectRect} tone="select" label={selectLabel} /> : null}
    </>
  );
}
`