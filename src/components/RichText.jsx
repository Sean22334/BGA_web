import React from 'react';
import { richText } from '../../shared/publishingRules.js';

export default function RichText({ value }) {
  let document;
  try { document = richText(value); } catch { return <p role="alert">This article's content is unavailable.</p>; }
  function render(node, key) {
    const children = node.content?.map((child, index) => render(child, index));
    if (node.type === 'text') return <React.Fragment key={key}>{(node.marks || []).reduce((text, mark) => mark.type === 'bold' ? <strong>{text}</strong> : mark.type === 'italic' ? <em>{text}</em> : <a href={mark.attrs.href} className="text-[#70a6ff] underline break-words" rel="noopener noreferrer">{text}</a>, node.text)}</React.Fragment>;
    if (node.type === 'paragraph') return <p key={key} className="mb-5 leading-8 whitespace-pre-wrap break-words">{children}</p>;
    if (node.type === 'bulletList') return <ul key={key} className="list-disc pl-6 mb-5 space-y-2">{children}</ul>;
    if (node.type === 'orderedList') return <ol key={key} start={node.attrs.start} className="list-decimal pl-6 mb-5 space-y-2">{children}</ol>;
    if (node.type === 'listItem') return <li key={key}>{children}</li>;
    if (node.type === 'hardBreak') return <br key={key} />;
    return <React.Fragment key={key}>{children}</React.Fragment>;
  }
  return <div className="text-slate-300 min-w-0">{render(document, 'document')}</div>;
}
