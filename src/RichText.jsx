import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import DOMPurify from "dompurify";
import { fonts, safeUrl } from "./model";
import { IconButton, Modal, Field, ErrorMessage } from "./ui";
export function SafeHTML({ html }) {
  return (
    <div
      className="rich-display"
      onClick={(e) => {
        const a = e.target.closest("a");
        if (a) {
          if (!safeUrl(a.getAttribute("href"))) e.preventDefault();
          a.rel = "noopener noreferrer";
        }
      }}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(html || "", {
          FORBID_TAGS: ["img", "iframe", "video", "style", "form", "input"],
          FORBID_ATTR: ["id"],
          ADD_ATTR: ["target"],
        }),
      }}
    />
  );
}
export default function RichText({ value, onChange, active, onEditor, style }) {
  const [showTools, setShowTools] = useState(false),
    toolId = useRef(crypto.randomUUID());
  const cb = useRef(onChange);
  useEffect(() => {
    const focus = (e) => setShowTools(e.detail === toolId.current);
    addEventListener("maiboard-text-focus", focus);
    return () => removeEventListener("maiboard-text-focus", focus);
  }, []);
  cb.current = onChange;
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
      TextStyleKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
    ],
    content: value,
    onFocus: () =>
      dispatchEvent(
        new CustomEvent("maiboard-text-focus", { detail: toolId.current }),
      ),
    onUpdate: ({ editor }) => cb.current(editor.getHTML()),
    editorProps: {
      attributes: {
        "aria-label": "Rich text block. Select text to format it.",
      },
    },
    shouldRerenderOnTransaction: true,
  });
  const [link, setLink] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (editor && !editor.isDestroyed && value !== editor.getHTML())
      editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);
  useEffect(() => {
    if (active && editor) onEditor?.(editor);
    return () => {
      if (active) onEditor?.(null);
    };
  }, [active, editor, onEditor]);
  if (!editor || editor.isDestroyed) return null;
  const run = (cmd) => editor.chain().focus()[cmd]().run();
  return (
    <div className="rich-editor" style={style}>
      {active &&
        showTools &&
        document.getElementById("text-tools-dock") &&
        createPortal(
          <div
            className="rich-toolbar"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <IconButton
              icon="ArrowLeft"
              title="Canvas tools"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowTools(false);
                editor.commands.blur();
              }}
            />
            <select
              aria-label="Font for selected text"
              value={editor.getAttributes("textStyle").fontFamily || ""}
              onChange={(e) =>
                editor.chain().focus().setFontFamily(e.target.value).run()
              }
            >
              <option value="">Font</option>
              {fonts.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <IconButton
              icon="Bold"
              title="Bold"
              active={editor.isActive("bold")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run("toggleBold")}
            />
            <IconButton
              icon="Italic"
              title="Italic"
              active={editor.isActive("italic")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run("toggleItalic")}
            />
            <IconButton
              icon="Underline"
              title="Underline"
              active={editor.isActive("underline")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run("toggleUnderline")}
            />
            <IconButton
              icon="Highlighter"
              title="Highlight selection"
              active={editor.isActive("highlight")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleHighlight({ color: "#82a9f3" })
                  .run()
              }
            />
            <IconButton
              icon="Heading2"
              title="Heading"
              active={editor.isActive("heading")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            />
            <IconButton
              icon="List"
              title="Bullet list"
              active={editor.isActive("bulletList")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run("toggleBulletList")}
            />
            <IconButton
              icon="ListOrdered"
              title="Numbered list"
              active={editor.isActive("orderedList")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run("toggleOrderedList")}
            />
            <IconButton
              icon="ListTodo"
              title="To-do checklist"
              active={editor.isActive("taskList")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run("toggleTaskList")}
            />
            <IconButton
              icon="Link2"
              title="Add or edit hyperlink"
              active={editor.isActive("link")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setError("");
                setLink(editor.getAttributes("link").href || "https://");
              }}
            />
          </div>,
          document.getElementById("text-tools-dock"),
        )}
      <EditorContent editor={editor} />
      {link !== null && (
        <Modal title="Add a hyperlink" onClose={() => setLink(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const url = safeUrl(link);
              if (!url) {
                setError("Use an https://, http://, mailto:, or tel: URL.");
                return;
              }
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({
                  href: url,
                  target: "_blank",
                  rel: "noopener noreferrer",
                })
                .run();
              setLink(null);
            }}
          >
            <p className="muted">
              Select the words you want to link, then add a destination.
            </p>
            <Field label="Link URL">
              <input
                autoFocus
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com"
              />
            </Field>
            <ErrorMessage>{error}</ErrorMessage>
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setLink(null);
                }}
              >
                Remove link
              </button>
              <button className="btn primary">Apply link</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
