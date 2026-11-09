import React, { useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { contentUrl } from '../../shared/publishingRules.js';

export default function ArticleEditor({ value, onChange }) {
  const [linkOpen, setLinkOpen] = useState(false), [url, setUrl] = useState(''), [error, setError] = useState('');
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false, underline: false, link: { openOnClick: false, autolink: false } })],
    content: value, immediatelyRender: false, shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: current }) => onChange(current.getJSON()),
    editorProps: { attributes: { role: 'textbox', 'aria-label': 'Article body', 'aria-multiline': 'true', class: 'article-editor min-h-48 p-4 outline-none text-slate-200' } }
  });
  if (!editor) return <p role="status">Loading article editor...</p>;
  const tools = [['Bold', 'bold', () => editor.chain().focus().toggleBold().run()], ['Italic', 'italic', () => editor.chain().focus().toggleItalic().run()], ['Bullet list', 'bulletList', () => editor.chain().focus().toggleBulletList().run()], ['Numbered list', 'orderedList', () => editor.chain().focus().toggleOrderedList().run()]];
  return <div className="rounded-xl border border-slate-600 bg-slate-950 overflow-hidden">
    <div role="toolbar" aria-label="Article formatting" className="flex flex-wrap gap-2 p-3 border-b border-slate-700">{tools.map(([label, mark, action]) => <button key={label} type="button" aria-pressed={editor.isActive(mark)} onMouseDown={(event) => event.preventDefault()} onClick={action} className={`px-3 py-1.5 text-sm rounded-lg border ${editor.isActive(mark) ? 'border-blue-400 bg-blue-500/25' : 'border-slate-700'}`}>{label}</button>)}<button type="button" className="px-3 py-1.5 text-sm rounded-lg border border-slate-700" onClick={() => { setUrl(editor.getAttributes('link').href || ''); setLinkOpen(!linkOpen); setError(''); }}>Link</button>{editor.isActive('link') && <button type="button" className="text-sm underline" onClick={() => editor.chain().focus().unsetLink().run()}>Remove link</button>}</div>
    {linkOpen && <div className="flex flex-wrap gap-2 p-3"><label className="flex-1 min-w-0 text-sm">Link URL<input value={url} onChange={(event) => setUrl(event.target.value)} className="block w-full bg-slate-900 rounded-lg border border-slate-600 p-2" /></label><button type="button" className="btn-secondary" onClick={() => { if (!contentUrl(url, { link: true })) { setError('Enter an HTTP, HTTPS, email or local URL.'); return; } editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run(); setLinkOpen(false); setError(''); }}>Apply link</button>{error && <p role="alert" className="text-red-300 w-full">{error}</p>}</div>}
    <EditorContent editor={editor} />
  </div>;
}
