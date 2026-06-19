"use client";

/**
 * RichEditor — Tiptap zengin metin editörü
 *
 * StarterKit v3 @tiptap/extension-underline içeriyor.
 * Ayrıca import etmiyoruz — duplicate uyarısı ortadan kalktı.
 * immediatelyRender: false → SSR hydration uyarısı giderildi.
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Heading2, Heading3,
  RotateCcw, RotateCw,
} from "lucide-react";
import { useEffect } from "react";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function ToolbarButton({ onClick, active, disabled, children, title }: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  children: React.ReactNode; title: string;
}) {
  return (
    <button
      type="button" title={title} disabled={disabled} onClick={onClick}
      className={`p-1.5 rounded transition-colors text-sm
        ${active
          ? "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >{children}</button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5 self-center" />;
}

export function RichEditor({ value, onChange, placeholder, minHeight = 200 }: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit v3 zaten underline, bold, italic, lists vb. içeriyor
      StarterKit.configure({
        heading:         { levels: [2, 3] },
        strike:          false,
        code:            false,
        codeBlock:       false,
        blockquote:      false,
        horizontalRule:  false,
        // underline StarterKit içinde — ayrıca ekleMİYORUZ
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: placeholder ?? "Ürün açıklamasını buraya yazın...",
      }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none px-4 py-3",
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.getHTML();
    const next = value || "<p></p>";
    if (current !== next && !editor.isFocused) {
      editor.commands.setContent(next);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
      {/* Araç çubuğu */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/40">
        <ToolbarButton title="Başlık H2" active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Başlık H3" active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Kalın (Ctrl+B)" active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="İtalik (Ctrl+I)" active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Altı Çizili (Ctrl+U)" active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Madde Listesi" active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Sıralı Liste" active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Sola Hizala" active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Ortala" active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Sağa Hizala" active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Geri Al (Ctrl+Z)" disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}>
          <RotateCcw className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Yinele (Ctrl+Y)" disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}>
          <RotateCw className="w-4 h-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
