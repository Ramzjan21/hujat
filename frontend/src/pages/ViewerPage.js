import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, AlertTriangle, ShieldAlert, Eye } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import './ViewerPage.css';

// Set PDF.js worker path — CDN dan yuklanadi
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const BACKEND_BASE = '';

export default function ViewerPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();

  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const pdfDocRef    = useRef(null);
  const viewStartRef = useRef(Date.now());
  const blobUrlRef   = useRef(null);

  const [docInfo, setDocInfo]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [warning, setWarning]       = useState('');
  const [blurred, setBlurred]       = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(0);
  const [scale, setScale]             = useState(1.4);

  // ── Log activity to backend ─────────────────────────────────────────────────
  const logActivity = useCallback(async (action, metadata = {}) => {
    try {
      await api.post(`/documents/${id}/log`, { action, metadata });
    } catch (_) {}
  }, [id]);

  // ── Fetch document metadata ─────────────────────────────────────────────────
  useEffect(() => {
    api.get(`/documents/${id}/info`)
      .then(r => setDocInfo(r.data.document))
      .catch(err => {
        const msg = err.response?.data?.error || 'Failed to load document.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Load and render document content ────────────────────────────────────────
  useEffect(() => {
    if (!docInfo) return;
    loadDocument();
    return () => {
      // Cleanup blob URL on unmount to prevent memory leaks
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      // Log view end with duration
      const duration = Math.round((Date.now() - viewStartRef.current) / 1000);
      logActivity('DOCUMENT_VIEW_END', { durationSeconds: duration });
    };
  }, [docInfo]);

  const loadDocument = async () => {
    try {
      // Fetch file as blob - NEVER expose raw file URL
      const response = await api.get(`/documents/${id}/view`, {
        responseType: 'arraybuffer',
      });

      const arrayBuffer = response.data;

      if (docInfo.mimeType === 'application/pdf') {
        await renderPDF(arrayBuffer);
      } else if (docInfo.mimeType.startsWith('image/')) {
        renderImage(arrayBuffer, docInfo.mimeType);
      } else if (docInfo.mimeType === 'text/plain') {
        renderText(arrayBuffer);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load document content.');
    }
  };

  // ── PDF rendering via PDF.js canvas (prevents direct text extraction) ───────
  const renderPDF = async (arrayBuffer) => {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    pdfDocRef.current = pdf;
    setTotalPages(pdf.numPages);
    await renderPage(pdf, 1);
  };

  const renderPage = async (pdf, pageNum) => {
    const page     = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas   = canvasRef.current;
    if (!canvas) return;

    canvas.height = viewport.height;
    canvas.width  = viewport.width;

    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
    }).promise;

    // Draw watermark on canvas after PDF renders
    drawWatermark(canvas);
  };

  const goToPage = async (pageNum) => {
    if (!pdfDocRef.current) return;
    const clamped = Math.max(1, Math.min(pageNum, totalPages));
    setCurrentPage(clamped);
    await renderPage(pdfDocRef.current, clamped);
  };

  // ── Image rendering on canvas ───────────────────────────────────────────────
  const renderImage = (arrayBuffer, mimeType) => {
    const blob   = new Blob([arrayBuffer], { type: mimeType });
    const url    = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    const img    = new Image();
    img.onload   = () => {
      const canvas  = canvasRef.current;
      if (!canvas) return;
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx     = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      drawWatermark(canvas);
      URL.revokeObjectURL(url); // Revoke immediately after drawing
      blobUrlRef.current = null;
    };
    img.src = url;
  };

  // ── Text file rendering ─────────────────────────────────────────────────────
  const renderText = (arrayBuffer) => {
    const text     = new TextDecoder('utf-8').decode(arrayBuffer);
    const canvas   = canvasRef.current;
    if (!canvas) return;
    canvas.width   = 900;
    canvas.height  = Math.max(600, text.split('\n').length * 20 + 60);
    const ctx      = canvas.getContext('2d');
    ctx.fillStyle  = '#1a1a3e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle  = '#e2e8f0';
    ctx.font       = '14px "Courier New", monospace';

    text.split('\n').forEach((line, i) => {
      ctx.fillText(line, 20, 30 + i * 20, canvas.width - 40);
    });

    drawWatermark(canvas);
  };

  // ── Watermark overlay drawn directly on canvas ──────────────────────────────
  const drawWatermark = (canvas) => {
    const ctx      = canvas.getContext('2d');
    const text     = 'MAXFIY | CONFIDENTIAL';
    const fontSize = Math.max(28, canvas.width / 18);

    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle   = '#ef4444';
    ctx.font        = `bold ${fontSize}px Arial`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';

    const stepX = canvas.width  / 2 + 60;
    const stepY = canvas.height / 3 + 40;

    for (let row = -1; row <= 4; row++) {
      for (let col = -1; col <= 3; col++) {
        ctx.save();
        ctx.translate(col * stepX + (row % 2 === 0 ? 0 : stepX / 2), row * stepY);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();
  };

  // ── Anti-download & Anti-copy protections ───────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Prevent right-click context menu
    const onContextMenu = (e) => {
      e.preventDefault();
      setWarning('O\'ng tugma xavfsizlik sababli bloklangan.');
      logActivity('DOWNLOAD_ATTEMPT', { method: 'right_click' });
    };

    // Block keyboard shortcuts
    const onKeyDown = (e) => {
      const blocked = [
        e.ctrlKey && e.key === 'c',  // Copy
        e.ctrlKey && e.key === 's',  // Save
        e.ctrlKey && e.key === 'u',  // View source
        e.ctrlKey && e.key === 'p',  // Print
        e.ctrlKey && e.key === 'a',  // Select all
        e.key === 'F12',             // DevTools
        e.ctrlKey && e.shiftKey && e.key === 'I', // DevTools
        e.ctrlKey && e.shiftKey && e.key === 'J', // DevTools console
        e.ctrlKey && e.shiftKey && e.key === 'C', // Inspect element
      ];

      if (blocked.some(Boolean)) {
        e.preventDefault();
        e.stopPropagation();

        if (e.ctrlKey && e.key === 'c') {
          logActivity('COPY_ATTEMPT', { method: 'keyboard' });
          setWarning('Nusxa olish taqiqlangan.');
        } else if (e.ctrlKey && e.key === 'p') {
          logActivity('PRINT_ATTEMPT', { method: 'keyboard' });
          setWarning('Chop etish taqiqlangan.');
        } else if (e.ctrlKey && e.key === 's') {
          logActivity('SAVE_ATTEMPT', { method: 'keyboard' });
          setWarning('Saqlash taqiqlangan.');
        }
        return false;
      }
    };

    // Prevent drag (dragging canvas image to desktop)
    const onDragStart = (e) => {
      e.preventDefault();
      logActivity('DOWNLOAD_ATTEMPT', { method: 'drag' });
    };

    document.addEventListener('keydown', onKeyDown, true);
    container.addEventListener('contextmenu', onContextMenu);
    container.addEventListener('dragstart', onDragStart);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      container.removeEventListener('contextmenu', onContextMenu);
      container.removeEventListener('dragstart', onDragStart);
    };
  }, [logActivity]);

  // ── Tab blur detection ───────────────────────────────────────────────────────
  useEffect(() => {
    const onBlur = () => {
      setBlurred(true);
      logActivity('TAB_BLUR');
    };
    const onFocus = () => setBlurred(false);

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [logActivity]);

  // ── DevTools detection (size-based heuristic) ───────────────────────────────
  useEffect(() => {
    const THRESHOLD = 160;
    let devToolsOpen = false;

    const check = () => {
      const widthDiff  = window.outerWidth  - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > THRESHOLD || heightDiff > THRESHOLD) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          setWarning('Dasturchi vositalari aniqlandi! Bu harakat qayd etildi.');
          logActivity('DEVTOOLS_DETECTED', { widthDiff, heightDiff });
        }
      } else {
        devToolsOpen = false;
      }
    };

    const interval = setInterval(check, 1500);
    return () => clearInterval(interval);
  }, [logActivity]);

  // ── Auto-clear warnings ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!warning) return;
    const t = setTimeout(() => setWarning(''), 3000);
    return () => clearTimeout(t);
  }, [warning]);

  if (loading) {
    return (
      <div className="viewer-loading">
        <div className="spinner" />
        <p>Hujjat yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="viewer-error">
        <ShieldAlert size={48} color="#ef4444" />
        <h2>Kirish taqiqlangan</h2>
        <p>{error}</p>
        <button className="btn btn-ghost mt-3" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Orqaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="viewer-page" ref={containerRef}>
      {/* Security warning banner */}
      {warning && (
        <div className="security-warning">
          <AlertTriangle size={16} />
          {warning}
        </div>
      )}

      {/* Tab blur overlay - hides content when user switches tabs */}
      {blurred && (
        <div className="blur-overlay">
          <ShieldAlert size={48} />
          <h2>Hujjat yashirildi</h2>
          <p>Ko'rishni davom ettirish uchun bosing</p>
        </div>
      )}

      {/* Header bar */}
      <div className="viewer-header">
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Orqaga
        </button>
        <div className="viewer-title">
          <Eye size={16} color="#6366f1" />
          <span>{docInfo?.title}</span>
        </div>
        <div className="viewer-watermark-label">
          <ShieldAlert size={14} color="#f59e0b" />
          <span>Himoyalangan Ko'rish</span>
        </div>
      </div>

      {/* PDF navigation */}
      {docInfo?.mimeType === 'application/pdf' && totalPages > 1 && (
        <div className="pdf-nav">
          <button
            className="btn btn-ghost"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            ← Oldingi
          </button>
          <span className="text-sm text-muted">{currentPage} / {totalPages} sahifa</span>
          <button
            className="btn btn-ghost"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Keyingi →
          </button>
          <div className="zoom-controls">
            <button className="btn btn-ghost" onClick={() => { setScale(s => Math.max(0.5, s - 0.2)); setTimeout(() => goToPage(currentPage), 0); }}>−</button>
            <span className="text-sm text-muted">{Math.round(scale * 100)}%</span>
            <button className="btn btn-ghost" onClick={() => { setScale(s => Math.min(3, s + 0.2)); setTimeout(() => goToPage(currentPage), 0); }}>+</button>
          </div>
        </div>
      )}

      {/* Canvas viewer - document rendered on canvas, not as embeddable element */}
      <div className="canvas-wrap">
        <canvas
          ref={canvasRef}
          className="doc-canvas"
          // Prevent copy by disabling selection via CSS + JS
          onCopy={e => { e.preventDefault(); logActivity('COPY_ATTEMPT', { method: 'copy_event' }); }}
        />

        {/* Invisible click-blocker overlay to capture all interaction events */}
        <div
          className="canvas-guard"
          onCopy={e => { e.preventDefault(); logActivity('COPY_ATTEMPT', { method: 'guard' }); }}
        />
      </div>
    </div>
  );
}
