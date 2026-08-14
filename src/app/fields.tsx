import { useState, type ReactNode } from 'react';
import { ICONS } from '../site/icons';

export function Text(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div className="f">
      <label>{props.label}</label>
      <input
        type="text"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.hint && <div className="hint">{props.hint}</div>}
    </div>
  );
}

export function Area(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <div className="f">
      <label>{props.label}</label>
      <textarea
        rows={props.rows ?? 3}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.hint && <div className="hint">{props.hint}</div>}
    </div>
  );
}

export function Toggle(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="f">
      <label className="toggle">
        <input
          type="checkbox"
          checked={props.value}
          onChange={(e) => props.onChange(e.target.checked)}
        />
        <span className="tk" />
        <span>{props.label}</span>
      </label>
    </div>
  );
}

export function ImageField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ok = /^https?:\/\//.test(props.value.trim());
  return (
    <div className="f">
      <label>{props.label}</label>
      <input
        type="text"
        value={props.value}
        placeholder="https://…"
        onChange={(e) => props.onChange(e.target.value)}
      />
      {ok && <img className="img-thumb" src={props.value.trim()} alt="" loading="lazy" />}
    </div>
  );
}

export function Acc(props: {
  title: string;
  pill?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  return (
    <div className={'acc' + (open ? ' open' : '')}>
      <button className="acc-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        {props.title}
        {props.pill && <span className="pill">{props.pill}</span>}
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className="acc-body">{props.children}</div>
    </div>
  );
}

export function IconPicker(props: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="f">
      <label>Icon</label>
      <div className="icons">
        {Object.entries(ICONS).map(([id, paths]) => (
          <button
            key={id}
            type="button"
            title={id}
            className={props.value === id ? 'on' : ''}
            onClick={() => props.onChange(id)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: paths }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
