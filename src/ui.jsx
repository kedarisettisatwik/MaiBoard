import React, { useEffect, useRef, useId } from "react";
import {
  X,
  Loader2,
  LayoutDashboard,
  MousePointer2,
  Hand,
  Type,
  Table2,
  PanelsTopLeft,
  MoveUpRight,
  BarChart3,
  Link2,
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Settings2,
  Upload,
  Download,
  ExternalLink,
  Check,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  ArrowLeft,
  Search,
  LogOut,
  MoreHorizontal,
  Play,
  Globe,
  Lock,
  Folder,
  FileSpreadsheet,
  Cloud,
  AlertCircle,
  Bold,
  Italic,
  Underline,
  Highlighter,
  List,
  ListOrdered,
  ListTodo,
  Heading2,
  Unlink,
  Square,
  CheckCircle2,
  PanelLeftClose,
  PanelRightClose,
  RefreshCw,
  GripVertical,
  Eye,
  EyeOff,
  Image,
  Columns3,
  RectangleHorizontal,
  Mail,
  ArrowUpRight,
  Palette,
  Menu,
  Send,
} from "lucide-react";
const icons = {
  X,
  Loader2,
  LayoutDashboard,
  MousePointer2,
  Hand,
  Type,
  Table2,
  PanelsTopLeft,
  MoveUpRight,
  BarChart3,
  Link2,
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Settings2,
  Upload,
  Download,
  ExternalLink,
  Check,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  ArrowLeft,
  Search,
  LogOut,
  MoreHorizontal,
  Play,
  Globe,
  Lock,
  Folder,
  FileSpreadsheet,
  Cloud,
  AlertCircle,
  Bold,
  Italic,
  Underline,
  Highlighter,
  List,
  ListOrdered,
  ListTodo,
  Heading2,
  Unlink,
  Square,
  CheckCircle2,
  PanelLeftClose,
  PanelRightClose,
  RefreshCw,
  GripVertical,
  Eye,
  EyeOff,
  Image,
  Columns3,
  RectangleHorizontal,
  Mail,
  ArrowUpRight,
  Palette,
  Menu,
  Send,
};
export function Icon({ name, size = 18, ...props }) {
  const C = icons[name] || Square;
  return <C size={size} strokeWidth={1.7} aria-hidden="true" {...props} />;
}
export function Logo({ onClick, light = false }) {
  return (
    <button
      className={`logo ${light ? "light" : ""}`}
      onClick={onClick}
      aria-label="MaiBoard home"
    >
      <svg
        className="logo-symbol"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="11" fill="#2563eb" />
        <path
          d="M10 28V12L20 23L30 12V28"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="6.5" y="8.5" width="7" height="7" rx="2" fill="white" />
        <rect x="26.5" y="8.5" width="7" height="7" rx="2" fill="white" />
        <rect x="16.5" y="19.5" width="7" height="7" rx="2" fill="#67e8f9" />
        <circle cx="10" cy="28" r="2.1" fill="#67e8f9" />
        <circle cx="30" cy="28" r="2.1" fill="#67e8f9" />
      </svg>
      <span>MaiBoard</span>
    </button>
  );
}
export function IconButton({
  icon,
  title,
  active = false,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? "active" : ""} ${className}`}
      title={title}
      aria-label={title}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    ref.current.showModal();
    return () => {};
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <IconButton icon="X" title="Close dialog" onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}
export function Field({ label, children, hint }) {
  const id = useId();
  const control =
    React.isValidElement(children) &&
    ["input", "select", "textarea"].includes(children.type)
      ? React.cloneElement(children, { "aria-labelledby": id })
      : children;
  return (
    <label className="field">
      <span id={id}>{label}</span>
      {control}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Spinner({ text = "Loading your workspace…" }) {
  return (
    <div className="loading">
      <Icon name="Loader2" className="spin" size={24} />
      <p>{text}</p>
    </div>
  );
}
export function ErrorMessage({ children }) {
  return children ? (
    <div className="error" role="alert">
      <Icon name="AlertCircle" size={17} />
      <span>{children}</span>
    </div>
  ) : null;
}
export const typeIcons = {
  text: "Type",
  table: "Table2",
  tabs: "PanelsTopLeft",
  button: "Link2",
  report: "BarChart3",
  image: "Image",
  section: "RectangleHorizontal",
  kanban: "Columns3",
};
