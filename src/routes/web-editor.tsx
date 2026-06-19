import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Alignment,
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  ImageBlock,
  ImageCaption,
  ImageInsertViaUrl,
  ImageResize,
  ImageStyle,
  ImageTextAlternative,
  ImageToolbar,
  Italic,
  Link as CKEditorLink,
  LinkImage,
  List,
  Paragraph,
  RemoveFormat,
  SourceEditing,
  Strikethrough,
  Table,
  TableToolbar,
  Underline,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

const ckEditorConfig = {
  licenseKey: "GPL",
  plugins: [
    Essentials,
    Paragraph,
    Heading,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Alignment,
    RemoveFormat,
    Table,
    TableToolbar,
    List,
    SourceEditing,
    ImageBlock,
    ImageCaption,
    ImageStyle,
    ImageResize,
    ImageToolbar,
    ImageInsertViaUrl,
    ImageTextAlternative,
    LinkImage,
    CKEditorLink,
  ],
  toolbar: {
    items: [
      "undo",
      "redo",
      "|",
      "heading",
      "|",
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "removeFormat",
      "|",
      "alignment",
      "|",
      "link",
      "bulletedList",
      "numberedList",
      "|",
      "insertTable",
      "insertImageViaUrl",
      "|",
      "sourceEditing",
    ],
    shouldNotGroupWhenFull: false,
  },
  image: {
    toolbar: [
      "imageStyle:inline",
      "imageStyle:block",
      "imageStyle:side",
      "|",
      "toggleImageCaption",
      "imageTextAlternative",
      "linkImage",
    ],
  },
  table: {
    contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
  },
  link: {
    addTargetToExternalLinks: true,
    defaultProtocol: "https://",
  },
};

export const Route = createFileRoute("/web-editor")({
  head: () => ({
    meta: [{ title: "Web Editor - Servio" }],
  }),
  component: WebEditorPage,
});

function WebEditorPage() {
  const [content, setContent] = useState(
    "<h2>Web Editor</h2><p>Use this page to draft and preview content with CKEditor.</p>",
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Content</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Web Editor</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A standalone CKEditor page for writing and previewing content.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Editor
            </h2>
            <CKEditor
              editor={ClassicEditor}
              config={ckEditorConfig}
              data={content}
              onChange={(_, editor) => setContent(editor.getData())}
            />
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Preview
            </h2>
            <div
              className="prose prose-gray max-w-none rounded-xl border border-border bg-background p-5 dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
