"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = { value: string; label: string; color?: string; hint?: string };

type Props = {
  id: string;
  options: SelectOption[];
  /** controlled */
  value?: string;
  onChange?: (value: string) => void;
  /** uncontrolled (ใช้ในฟอร์ม) — ส่งค่าผ่าน hidden input ชื่อ name */
  defaultValue?: string;
  name?: string;
  label?: string;
  hideLabel?: boolean;
  className?: string;
};

/** dropdown ที่แต่งได้ — ใช้คีย์บอร์ดได้ครบ (↑ ↓ Home End Enter Esc และพิมพ์ตัวอักษรเพื่อกระโดด) และรองรับ screen reader */
export default function Select({ id, options, value, onChange, defaultValue, name, label, hideLabel, className }: Props) {
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const uid = useId();
  const listId = `${id}-list`;
  const labelId = `${id}-label`;
  const selected = options.find((o) => o.value === current) ?? options[0];

  function openList() {
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  }

  function choose(i: number) {
    const v = options[i]?.value;
    if (v === undefined) return;
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(false);
    buttonRef.current?.focus();
  }

  // ปิดเมื่อคลิกข้างนอก
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // เลื่อนตัวเลือกที่ active ให้อยู่ในกรอบ
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKeyDown(e: React.KeyboardEvent) {
    const last = options.length - 1;
    const move = (to: (i: number) => number) => {
      e.preventDefault();
      if (!open) openList();
      setActive((i) => Math.min(last, Math.max(0, to(i))));
    };
    switch (e.key) {
      case "ArrowDown": return open ? move((i) => i + 1) : (e.preventDefault(), openList());
      case "ArrowUp": return open ? move((i) => i - 1) : (e.preventDefault(), openList());
      case "Home": return open && move(() => 0);
      case "End": return open && move(() => last);
      case "Enter":
      case " ":
        e.preventDefault();
        return open ? choose(active) : openList();
      case "Escape":
        if (open) { e.preventDefault(); setOpen(false); }
        return;
      case "Tab":
        return setOpen(false);
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const now = Date.now();
          typed.current.text = (now - typed.current.at < 600 ? typed.current.text : "") + e.key.toLowerCase();
          typed.current.at = now;
          const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
          if (i >= 0) move(() => i);
        }
    }
  }

  return (
    <div ref={rootRef} className={`select${open ? " is-open" : ""}${className ? " " + className : ""}`}>
      {label && (
        <span id={labelId} className={hideLabel ? "sr-only" : "select-label"}>{label}</span>
      )}
      {name && <input type="hidden" name={name} value={current} />}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className="select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={label ? `${labelId} ${id}` : undefined}
        aria-activedescendant={open ? `${uid}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        {selected?.color && <span className="select-dot" style={{ background: selected.color }} aria-hidden="true" />}
        <span className="select-value">{selected?.label}</span>
        <svg className="select-chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-labelledby={label ? labelId : id}
        className="select-list"
        tabIndex={-1}
      >
        {options.map((o, i) => (
          <li
            key={o.value}
            id={`${uid}-opt-${i}`}
            role="option"
            aria-selected={o.value === current}
            className={`select-option${i === active ? " is-active" : ""}`}
            style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
            onPointerEnter={() => setActive(i)}
            onClick={() => choose(i)}
          >
            {o.color && <span className="select-dot" style={{ background: o.color }} aria-hidden="true" />}
            <span className="select-option-label">{o.label}</span>
            {o.hint && <span className="select-hint">{o.hint}</span>}
            <svg className="select-check" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </li>
        ))}
      </ul>
    </div>
  );
}
